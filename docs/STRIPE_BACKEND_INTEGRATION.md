# Stripe Backend Integration (ERVA)

How Stripe is wired into ERVA's existing ingest → detect → report pipeline. Two integration
points, same as before the provider swap: Stripe as the transaction data source (webhook
ingest), and Stripe as the enforcement/action layer (test-mode quarantine transfers).

## 1. Webhook ingest (Stripe as data source)

- Route: `POST /api/v1/webhooks/stripe`
- Verification: `app.api.routes.webhooks.verify_stripe_signature` reads the raw request body
  and the `Stripe-Signature` header, then calls `stripe.Webhook.construct_event(payload,
  sig_header, STRIPE_WEBHOOK_SECRET)`. This is Stripe's official verification flow — it handles
  the raw-body requirement, the 5-minute replay-protection tolerance, and the constant-time HMAC
  comparison. We never hand-roll the signature check.
- On `stripe.SignatureVerificationError` → `400`. On a missing header → `401`.
- We only act on `payment_intent.succeeded` events; everything else is acknowledged and ignored.
- `process_stripe_webhook` maps the Stripe `PaymentIntent` onto the same internal
  `TransactionIngestItem` shape `ingest_service.py` already expects (amount in cents → naira,
  currency, timestamp from `created`, sender/receiver from `metadata`) — the internal ingest
  pipeline itself is untouched, only the adapter changed.
- If the payment's `metadata.merchant_name` matches one of the four demo chain merchants (Alpha
  Remit Ltd → Quick Cash Services → Shell Co Alpha Ltd → Musa Lawal), one synthetic layering hop
  is written and detection re-runs immediately — this is the same fraud-chain demo mechanic as
  before, just triggered off a real, signature-verified Stripe event instead of Squad's
  multi-merchant HMAC scheme.

## 2. STR filing (Stripe as action layer)

- Route: `POST /api/v1/str/{id}/file` (unchanged path)
- On an approved STR, `stripe_service.quarantine_funds()` calls `stripe.Transfer.create(...)`
  against a Stripe Connect destination account (`STRIPE_QUARANTINE_DESTINATION`), **in Stripe
  test mode only**. This does not move real money — no live Connect/Transfers setup was
  configured for this build; if the call fails (no destination account, no key, network error),
  the filing still records an offline reference and proceeds. The STR draft's
  `stripe_transaction_ref` field records whichever happened.
- Entities linked to the alert are still frozen (`metadata_json.frozen = true`) and a symbolic
  ₦1 ledger-entry transaction is recorded either way, independent of whether the real Stripe
  call succeeded.

## Environment variables

| Variable | Purpose |
|---|---|
| `STRIPE_SECRET_KEY` | Server-side API key (test mode: `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the webhook endpoint (`whsec_...`) |
| `STRIPE_QUARANTINE_DESTINATION` | Stripe Connect account ID that receives quarantine transfers |

## Local / demo webhook flow

```bash
stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe
stripe trigger payment_intent.succeeded
```

`stripe listen` prints a `whsec_...` value the first time it runs — use that as
`STRIPE_WEBHOOK_SECRET` for local testing (it's session-specific, not your dashboard's
permanent webhook secret). This is the real, live, correctly-signed demo moment: an actual
Stripe test event, verified with the real signature check, landing in the running backend.

If live CLI triggering isn't practical during a specific recording (network hiccup, CLI not
installed on the recording machine), `POST /api/v1/webhooks/stripe/simulate` is kept as a
reliability fallback — it injects the same four-hop fraud chain directly, no Stripe signature
involved, purely internal. Both paths feed the same detection pipeline.

## Validation

```bash
# Correctly-signed payload -> 200
stripe trigger payment_intent.succeeded

# Manually tampered body or wrong secret -> 400
curl -X POST localhost:8000/api/v1/webhooks/stripe \
  -H "Stripe-Signature: t=0,v1=deadbeef" \
  -d '{"fake": true}'
```
