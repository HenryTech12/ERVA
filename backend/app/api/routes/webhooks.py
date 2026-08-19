import asyncio
import json
import logging
from datetime import datetime, timedelta, timezone
from decimal import Decimal, InvalidOperation
from uuid import uuid4
from typing import Dict, Any

import stripe
from fastapi import APIRouter, Request, Header, HTTPException, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models import DecisionStatus, Entity, Alert, Transaction
from app.schemas.transactions import TransactionIngestItem
from app.services.audit_service import write_audit_event
from app.services.ingest_service import create_ingest_job
from app.services.detection_service import run_heuristic_detection
from app.core.deps import get_session_factory

router = APIRouter()
logger = logging.getLogger(__name__)

# Ordered chain for synthetic layering hops — each real payment advances one step.
# Purely internal demo labeling, not tied to any payment-provider credential.
MERCHANT_CHAIN_ORDER = [
    "Alpha Remit Ltd",
    "Quick Cash Services",
    "Shell Co Alpha Ltd",
    "Musa Lawal",
]

# Stable entity IDs for real-payment chain hops — deliberately different from
# SIM-* simulate entities so a prior simulate run cannot block detection here
CHAIN_ENTITY_IDS = {
    "Alpha Remit Ltd":     "CHAIN-ALPHA-REMIT",
    "Quick Cash Services": "CHAIN-QUICK-CASH",
    "Shell Co Alpha Ltd":  "CHAIN-SHELL-CO",
    "Musa Lawal":          "CHAIN-MUSA-LAWAL",
}


async def verify_stripe_signature(request: Request, stripe_signature: str = Header(None)):
    """Verifies the webhook using Stripe's official construct_event flow — this does
    the raw-body handling, timestamp-tolerance replay protection, and constant-time
    comparison for us; we never hand-roll the HMAC check."""
    if not stripe_signature:
        raise HTTPException(status_code=401, detail="Missing Stripe-Signature header")

    body = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=body,
            sig_header=stripe_signature,
            secret=settings.stripe_webhook_secret,
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.SignatureVerificationError:
        logger.warning("Stripe signature verification failed")
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    return event


@router.post("/stripe", status_code=200)
async def stripe_webhook(event: stripe.Event = Depends(verify_stripe_signature)):
    """Receives Stripe webhook events for the connected account."""
    if event.type != "payment_intent.succeeded":
        logger.info(f"Ignoring non-payment Stripe event: {event.type}")
        return {"status": "ignored", "event": event.type}

    # Stripe SDK objects aren't plain dicts (attribute access only) — convert once
    # here so the rest of the pipeline can use consistent dict-style access.
    asyncio.create_task(process_stripe_webhook(event.data.object.to_dict()))
    return {"status": "success", "message": "Webhook accepted", "event_id": event.id}


@router.post("/demo/reset", status_code=200)
async def demo_reset():
    """Reset to a clean demo state with one alert of each pattern type visible.

    Removes all Stripe/chain/simulate data, wipes alerts, then injects:
    - 1 POS cash-out ring  (RESET-POS-* entities, fresh timestamps)
    Shell director web fires from seeded business entities.
    Layered transfer chain is triggered live via the Simulate button.
    """
    from sqlalchemy import text
    from app.core.neo4j_client import neo4j_driver
    from app.core.redis_client import redis_client as _redis
    from app.services.detection_service import run_heuristic_detection

    results = {}

    # Clear detection lock so re-detection acquires it immediately
    try:
        _redis.delete("ingest:jobs:queue", "detection:lock")
        results["redis"] = "cleared"
    except Exception as e:
        results["redis"] = f"error: {e}"

    db_factory = get_session_factory()
    with db_factory() as db:
        # Collect existing demo entity UUIDs for Neo4j cleanup
        demo_entity_rows = db.execute(
            text("SELECT id FROM entities WHERE metadata_json::jsonb ? 'external_id'")
        ).fetchall()
        demo_entity_ids = [str(r[0]) for r in demo_entity_rows]

        # Delete all demo transactions and entities
        db.execute(text(
            "DELETE FROM transactions WHERE channel IN ('stripe', 'stripe_chain', 'stripe_simulate', 'demo_reset', 'enforcement')"
        ))
        db.execute(text(
            "DELETE FROM entities WHERE metadata_json::jsonb ? 'external_id'"
        ))
        # Unfreeze any seeded entities that were frozen during a prior demo
        db.execute(text(
            "UPDATE entities SET metadata_json = metadata_json - 'frozen' - 'frozen_at' - 'frozen_str_id' "
            "WHERE metadata_json::jsonb ? 'frozen'"
        ))
        # Wipe alerts, STR drafts, audit log (raw SQL bypasses immutability listener)
        db.execute(text("TRUNCATE TABLE str_drafts, audit_log, alerts CASCADE"))
        db.commit()

        # --- Inject showcase: POS cash-out ring (6 sources → 1 beneficiary) ---
        now = datetime.now(timezone.utc)
        pos_sources = [
            _get_or_create_entity(db, f"RESET-POS-SRC-{j}", f"POS Source {j}")
            for j in range(1, 7)
        ]
        pos_beneficiary = _get_or_create_entity(db, "RESET-POS-BEN", "Kano Cash Outlet")
        db.flush()
        for j, src in enumerate(pos_sources):
            db.add(Transaction(
                source_entity_id=src.id,
                destination_entity_id=pos_beneficiary.id,
                amount=Decimal("150000"),
                currency="NGN",
                occurred_at=now - timedelta(minutes=(60 + j * 5)),
                reference=f"RESET-POS-{j + 1}-{uuid4().hex[:8].upper()}",
                channel="demo_reset",
                metadata_json={"demo": True, "pos_step": j + 1},
            ))
        db.flush()

        # Capture IDs before session closes (attributes expire on session close)
        injected_entity_ids = (
            [str(e.id) for e in pos_sources]
            + [str(pos_beneficiary.id)]
        )

        # Run detection — fires POS ring + shell director web from seeded data
        # Layered chain is triggered live via the Simulate button
        run_heuristic_detection(db)
        db.commit()

    results["postgres"] = (
        f"cleared {len(demo_entity_ids)} old demo entities; "
        f"injected POS ring showcase; alerts regenerated"
    )

    # Remove old demo nodes from Neo4j
    try:
        with neo4j_driver.session() as session:
            if demo_entity_ids:
                session.run(
                    "MATCH (e:Entity) WHERE e.entity_id IN $ids DETACH DELETE e",
                    ids=demo_entity_ids,
                )
        results["neo4j"] = f"cleared {len(demo_entity_ids)} old demo nodes"
    except Exception as e:
        results["neo4j"] = f"error: {e}"

    logger.info("Demo reset completed: %s", results)
    return {"status": "ok", "cleared": results}


@router.post("/stripe/chain-step", status_code=200)
async def stripe_chain_step(request: Request):
    """Called by the frontend after each simulated Stripe payment — advances the fraud
    chain by one hop. No signature required; this is an internal call from ERVA's own
    frontend, not from Stripe."""
    try:
        body = await request.json()
    except Exception:
        body = {}
    merchant_name = str(body.get("merchant_name", ""))
    amount_naira = Decimal(str(body.get("amount_naira", 100000)))
    if not merchant_name:
        return {"status": "error", "message": "merchant_name required"}
    asyncio.create_task(_write_chain_hop(merchant_name, amount_naira))
    return {"status": "queued", "merchant": merchant_name}


@router.post("/stripe/simulate", status_code=200)
async def stripe_webhook_simulate():
    """Demo: inject a 3-hop layered transfer chain for judge presentations — no Stripe
    signature required. Kept as a reliability fallback alongside the real
    `stripe trigger payment_intent.succeeded` flow used during the live recording."""
    chain = [
        {
            "sender_id": "SIM-ALPHA-REMIT", "sender_name": "Alpha Remit Ltd",
            "recv_id":   "SIM-QUICK-CASH",  "recv_name":  "Quick Cash Services",
            "amount": Decimal("200000"),
        },
        {
            "sender_id": "SIM-QUICK-CASH",  "sender_name": "Quick Cash Services",
            "recv_id":   "SIM-SHELL-CO",    "recv_name":   "Shell Co Alpha Ltd",
            "amount": Decimal("400000"),
        },
        {
            "sender_id": "SIM-SHELL-CO",    "sender_name": "Shell Co Alpha Ltd",
            "recv_id":   "SIM-MUSA-LAWAL",  "recv_name":   "Musa Lawal",
            "amount": Decimal("600000"),
        },
        {
            "sender_id": "SIM-MUSA-LAWAL",  "sender_name": "Musa Lawal",
            "recv_id":   "SIM-FINAL-BEN",   "recv_name":   "Final Beneficiary",
            "amount": Decimal("800000"),
        },
    ]
    asyncio.create_task(_process_simulate_ring(chain))
    return {"status": "success", "message": "Fraud ring simulation queued", "steps": len(chain)}


async def process_stripe_webhook(payment_intent: Dict[str, Any]):
    """Records the real Stripe payment then writes one synthetic chain hop for detection."""
    db_factory = get_session_factory()
    metadata = payment_intent.get("metadata") or {}
    merchant_name = metadata.get("merchant_name", "Stripe Merchant Account")

    with db_factory() as db:
        try:
            sender_id = str(metadata.get("sender_id") or payment_intent.get("customer") or "").strip()
            receiver_id = str(metadata.get("receiver_id") or merchant_name).strip()

            if not sender_id or not receiver_id:
                logger.warning(f"Stripe webhook missing sender/receiver — payment_intent {payment_intent.get('id')}")
                return

            sender_entity = _get_or_create_entity(db, sender_id, metadata.get("sender_name") or sender_id)
            receiver_entity = _get_or_create_entity(db, receiver_id, merchant_name)

            amount = _parse_amount(payment_intent)

            # Write arrival audit event — powers the Webhooks tab in Ingest Monitor
            write_audit_event(
                db=db,
                action="stripe_webhook_enqueued",
                entity_ids=[str(sender_entity.id), str(receiver_entity.id)],
                alert_id=None,
                model_version="webhook_v1",
                decision=DecisionStatus.pending,
                payload_json={
                    "merchant": merchant_name,
                    "ref": payment_intent.get("id", ""),
                    "amount": str(amount),
                },
            )
            db.flush()

            ingest_item = TransactionIngestItem(
                source_entity_id=sender_entity.id,
                destination_entity_id=receiver_entity.id,
                amount=amount,
                currency=(payment_intent.get("currency") or "ngn").upper(),
                occurred_at=_parse_timestamp(payment_intent),
                reference=payment_intent.get("id") or f"STRIPE-{uuid4().hex[:10].upper()}",
                channel="stripe",
                metadata_json={"tenant": merchant_name},
            )
            create_ingest_job(db=db, payload=ingest_item)
            # create_ingest_job commits internally; session stays open

            # Kick off the synthetic chain hop as a separate background task so it
            # gets its own DB session (create_ingest_job already committed above)
            if merchant_name in MERCHANT_CHAIN_ORDER:
                asyncio.create_task(_write_chain_hop(merchant_name, amount))

        except Exception as e:
            logger.error(f"Background processing failure: {e}", exc_info=True)
            db.rollback()


async def _write_chain_hop(merchant_name: str, amount: Decimal):
    """Write one synthetic layering hop and immediately run detection.
    Shared by both the real Stripe webhook path and the /chain-step frontend path."""
    try:
        chain_idx = MERCHANT_CHAIN_ORDER.index(merchant_name)
    except ValueError:
        logger.warning(f"_write_chain_hop: {merchant_name!r} not in chain — skipping")
        return

    if chain_idx >= len(MERCHANT_CHAIN_ORDER) - 1:
        return  # terminal merchant (Musa Lawal) — no hop needed

    next_name = MERCHANT_CHAIN_ORDER[chain_idx + 1]
    db_factory = get_session_factory()
    with db_factory() as db:
        try:
            this_chain = _get_or_create_entity(db, CHAIN_ENTITY_IDS[merchant_name], merchant_name)
            next_chain = _get_or_create_entity(db, CHAIN_ENTITY_IDS[next_name], next_name)
            chain_tx = Transaction(
                source_entity_id=this_chain.id,
                destination_entity_id=next_chain.id,
                amount=amount if amount > 0 else Decimal("100000"),
                currency="NGN",
                occurred_at=datetime.now(timezone.utc),
                reference=f"CHAIN-{chain_idx + 1}-{uuid4().hex[:8].upper()}",
                channel="stripe_chain",
                metadata_json={"chain_step": chain_idx + 1, "merchant": merchant_name},
            )
            db.add(chain_tx)
            db.flush()
            run_heuristic_detection(db)
            db.commit()
            logger.info(f"Chain hop {chain_idx + 1}: {merchant_name} → {next_name}")
        except Exception as e:
            logger.error(f"Chain hop failed for {merchant_name}: {e}", exc_info=True)
            db.rollback()


async def _process_simulate_ring(chain: list):
    """Writes chain transactions directly to DB and runs detection immediately for the demo."""
    db_factory = get_session_factory()
    now = datetime.now(timezone.utc)
    with db_factory() as db:
        try:
            for i, step in enumerate(chain):
                sender = _get_or_create_entity(db, step["sender_id"], step["sender_name"])
                receiver = _get_or_create_entity(db, step["recv_id"], step["recv_name"])
                tx = Transaction(
                    source_entity_id=sender.id,
                    destination_entity_id=receiver.id,
                    amount=step["amount"],
                    currency="NGN",
                    occurred_at=now,
                    reference=f"SIM-RING-{i + 1}-{uuid4().hex[:8].upper()}",
                    channel="stripe_simulate",
                    metadata_json={"simulation": True, "step": i + 1},
                )
                db.add(tx)
                db.flush()

            run_heuristic_detection(db)
            db.commit()
            logger.info("Simulate ring: transactions written and detection complete")
        except Exception as e:
            logger.error(f"Simulate ring processing failed: {e}", exc_info=True)
            db.rollback()


# --- Helper functions ---

def _get_or_create_entity(db: Session, external_id: str, display_name: str | None) -> Entity:
    entity = db.scalar(
        select(Entity).where(Entity.metadata_json["external_id"].astext == external_id)
    )
    if entity is None:
        entity = Entity(
            entity_type="individual",
            full_name=display_name or external_id,
            metadata_json={"external_id": external_id},
        )
        db.add(entity)
        db.flush()
    return entity


def _parse_amount(payment_intent: Dict[str, Any]) -> Decimal:
    raw = payment_intent.get("amount") or payment_intent.get("amount_received") or 0
    try:
        return Decimal(str(raw)) / 100  # cents -> naira
    except InvalidOperation:
        return Decimal("0")


def _parse_timestamp(payment_intent: Dict[str, Any]) -> datetime:
    raw = payment_intent.get("created")
    if raw:
        try:
            return datetime.fromtimestamp(int(raw), tz=timezone.utc)
        except (ValueError, TypeError):
            pass
    return datetime.now(timezone.utc)
