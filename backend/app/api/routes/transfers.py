import logging

import stripe
from fastapi import APIRouter, HTTPException

from app.core.config import settings
from app.schemas.stripe import TransferRequest

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/initiate")
async def initiate_demo_transfer(payload: TransferRequest):
    """UI calls this to start a test-mode Stripe transfer to a Connect destination account."""
    stripe.api_key = settings.stripe_secret_key
    destination = payload.destination or settings.stripe_quarantine_destination

    try:
        transfer = stripe.Transfer.create(
            amount=payload.amount,
            currency=payload.currency,
            destination=destination,
            description=payload.description,
        )
    except Exception as e:
        logger.error(f"Stripe transfer failed: {e}")
        raise HTTPException(status_code=400, detail="Stripe transfer failed") from e

    return {"status": "success", "tx_ref": transfer.id, "stripe_response": transfer}
