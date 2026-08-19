from pydantic import BaseModel, Field


class TransferRequest(BaseModel):
    amount: int = Field(..., example=5000, description="Amount in cents (e.g. 5000 = $50.00 / test-mode equivalent)")
    destination: str = Field(default="", description="Stripe Connect destination account ID")
    currency: str = Field(default="ngn", description="Three-letter ISO currency code")
    description: str = Field(default="ERVA Demo Transfer")


class SimulatePaymentIntentRequest(BaseModel):
    # Helps manually trigger a test payment_intent.succeeded event during a demo,
    # as a fallback alongside `stripe trigger payment_intent.succeeded`.
    amount: int = Field(..., example=20000)
    merchant_name: str = Field(default="")
