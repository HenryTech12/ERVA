import logging

import stripe
from sqlalchemy.orm import Session

from app.core.config import settings
from app.services.audit_service import write_audit_event
from app.models.enums import DecisionStatus

logger = logging.getLogger(__name__)


class StripeService:
    def __init__(self):
        stripe.api_key = settings.stripe_secret_key

    def quarantine_funds(self, payload: dict, db: Session = None):
        """
        Moves flagged funds into ERVA's quarantine account via Stripe's Transfers API
        (test mode). Requires a Stripe Connect destination account
        (STRIPE_QUARANTINE_DESTINATION) — without one this raises and the caller falls
        back to an offline reference, same as any other Stripe API failure.
        """
        transaction_ref = payload.get("transaction_ref")
        logger.info(f"Quarantining funds for transaction {transaction_ref}")

        try:
            transfer = stripe.Transfer.create(
                amount=int(float(payload.get("amount", 0)) * 100),  # naira -> kobo-equivalent cents
                currency="ngn",
                destination=settings.stripe_quarantine_destination,
                transfer_group=transaction_ref,
                description="Flagged as High Risk by ERVA",
            )
            res_data = {"id": transfer.id, "destination": transfer.destination, "amount": transfer.amount}

            if db:
                write_audit_event(
                    db=db,
                    action="autonomous_quarantine_triggered",
                    entity_ids=[payload.get("sender_id", "unknown")],
                    alert_id=None,
                    model_version="erva_v1",
                    decision=DecisionStatus.approved,
                    payload_json={"request": payload, "response": res_data},
                )
                db.commit()

            return res_data
        except Exception as e:
            logger.error(f"Failed to quarantine funds via Stripe: {e}")
            if db:
                write_audit_event(
                    db=db,
                    action="autonomous_quarantine_failed",
                    entity_ids=[payload.get("sender_id", "unknown")],
                    alert_id=None,
                    model_version="erva_v1",
                    decision=DecisionStatus.escalated,
                    payload_json={"error": str(e), "request": payload},
                )
                db.commit()
            return None


stripe_service = StripeService()
