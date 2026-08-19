# Deploying the backend to Render

Why Render instead of Zerops: Render's native Python/Docker builds run on a standard Debian
(glibc) base, not Alpine. The Zerops attempt failed because `scikit-learn` has never published
a musl-compatible (Alpine) wheel for any version, and Zerops' Python image builds on musl — pip
fell back to compiling from source and there was no C compiler in the container. Render sidesteps
this entirely: `render.yaml` below builds `erva-api` and `erva-worker` straight from
`backend/Dockerfile`, the same image already validated locally in this session with zero
compilation, every package installing as a prebuilt wheel.

## 1. Create the Blueprint

Render dashboard → **New → Blueprint** → connect the `HenryTech12/ERVA` repo → branch
`erva-quantum-rebrand` (or `main`, once the PR is merged). Render finds `render.yaml` at the repo
root automatically and shows a preview of everything it's about to create:

- `erva-db` — managed Postgres
- `erva-cache` — managed Key Value store (Valkey, Redis-compatible)
- `erva-api` — web service, built from `backend/Dockerfile`, public HTTPS URL
- `erva-worker` — background worker, built from `backend/Dockerfile.worker` (same base image and
  `requirements.txt` as the API, just a different `CMD` — Render's docker runtime doesn't allow
  overriding a container's command from `render.yaml`, so this needs its own Dockerfile rather
  than a `startCommand` field), no public URL

Click **Apply** to create everything at once.

## 2. Fill in the secrets Render can't generate itself

`POSTGRES_URL` and `REDIS_URL` are wired automatically (`fromDatabase` / `fromService` in
`render.yaml` — Render fills these in with the real connection strings the moment `erva-db` and
`erva-cache` exist, no copy-pasting required). Everything else is declared with `sync: false`,
which means Render creates the env var but leaves it blank for you to fill in via the dashboard
— **nothing sensitive is ever committed to the repo**. On `erva-api` (Neo4j, Groq, and Stripe
vars) and `erva-worker` (Neo4j and Groq only — the worker never touches Stripe):

| Variable | Where it comes from |
|---|---|
| `NEO4J_URI` / `NEO4J_USER` / `NEO4J_PASSWORD` | Neo4j AuraDB console — free tier, `neo4j+s://<id>.databases.neo4j.io`. Render has no managed graph database, so this stays external, same as local dev. |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (test mode: `sk_test_...`) — `erva-api` only |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → add endpoint `https://<erva-api-url>/api/v1/webhooks/stripe`, subscribe to `payment_intent.succeeded`, copy the signing secret (`whsec_...`) — `erva-api` only |
| `STRIPE_QUARANTINE_DESTINATION` | A Stripe Connect test account ID, if wiring up the quarantine-transfer demo; leave blank otherwise — `erva-api` only |
| `ALLOWED_ORIGINS` | Your Vercel production URL, e.g. `https://erva.vercel.app` — `erva-api` only |
| `ALLOWED_ORIGIN_REGEX` | Optional, e.g. `https://erva-.*\.vercel\.app` to also allow Vercel preview deployments — `erva-api` only |

`GROQ_MODEL` is already set to `llama-3.3-70b-versatile` directly in `render.yaml` — nothing to
do there.

## 3. Point the frontend at it

`erva-api`'s public URL is shown on its dashboard page (`https://erva-api-xxxx.onrender.com` or
a custom domain you attach). Set that + `/api/v1` as `VITE_API_BASE_URL` on the Vercel project —
see the **Deployment** section of the root `README.md` for the Vercel side.

## 4. Seed the deployed database

```bash
POSTGRES_URL=<erva-db connection string, from its Render dashboard page> \
API_BASE_URL=https://<erva-api-url>/api/v1 \
python scripts/seed.py
```

`backend/models/isolation_forest.joblib` and `scaler.joblib` are already committed (the validated
model — see `docs/VALIDATION_METRICS_CARD.md`), so retraining isn't necessary; this step only
loads entities/transactions and runs them through the live ingest pipeline.

## Notes

- **Free tier**: Render's free web-service tier spins down after inactivity and takes ~30-60s to
  wake on the next request — fine for a demo you're actively driving, less fine for a judge
  hitting a cold link. The `starter` plan set in `render.yaml` avoids that; adjust in the
  dashboard after import if budget matters more than always-warm.
- `erva-worker` has no `healthCheckPath` and no public port — it's a pure background consumer of
  the Redis ingest queue, same role as the `ingest_worker` service in `docker-compose.yml` for
  local dev.
