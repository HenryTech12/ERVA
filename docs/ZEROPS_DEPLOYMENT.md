# Deploying the backend to Zerops

Two pieces: a **project import YAML** (paste once, when creating the project — provisions
Postgres, Valkey/Redis, and empty `api`/`worker` service slots in one step) and the repo-root
[`zerops.yml`](../zerops.yml) (tells Zerops how to build and run `api` and `worker` from this
git repo — used automatically once you connect the repo).

> The exact key names below (`envVariables`, `buildFromGit`, etc.) are drafted from Zerops'
> documented conventions but weren't cross-checked against a live Zerops session while writing
> this. Zerops validates the YAML on import and will point out anything it doesn't recognize —
> if it rejects a key, check the current schema at [docs.zerops.io](https://docs.zerops.io) and
> adjust; the shape (services → build → run → envVariables) is stable even if a field name has
> moved.

## 1. Create the project

In the Zerops dashboard: **New Project → Import YAML**, paste:

```yaml
project:
  name: erva

services:
  - hostname: db
    type: postgresql@16
    mode: NON_HA

  - hostname: cache
    type: valkey@7.2
    mode: NON_HA

  - hostname: api
    type: python@3.11
    buildFromGit: https://github.com/HenryTech12/ERVA
    enableSubdomainAccess: true

  - hostname: worker
    type: python@3.11
    buildFromGit: https://github.com/HenryTech12/ERVA
```

This creates the four services. `api` and `worker` will pull `zerops.yml` from the repo root on
each deploy (push to the connected branch, or trigger a deploy from the dashboard) — that file
already defines their build/run pipelines, matching the `setup: api` / `setup: worker` blocks.

`enableSubdomainAccess: true` gives `api` a public `https://api-<id>.prg1.zerops.app`-style URL —
that's your `VITE_API_BASE_URL` for the frontend (see below). `worker` has no ports and needs no
public URL; it only consumes the Redis ingest queue.

## 2. Set the app-specific environment variables

`zerops.yml` references `${db_connectionString}` and `${cache_connectionString}` — these are
populated automatically by Zerops once `db`/`cache` exist (the `{servicehostname}_{variablename}`
cross-service reference pattern). Confirm the exact variable name in the `db` service's
**Environment variables** tab before your first deploy — Zerops may expose it as
`connectionString` or something adjacent depending on version, and the deploy will fail loudly
with an unresolved-variable error if the name doesn't match, so this is a five-second check, not
a guess you have to get right blind.

The rest — Neo4j, Groq, Stripe, CORS — aren't Zerops-managed, so set them as **project-level
environment variables** (Project → Environment Variables) so `${GROQ_API_KEY}` etc. resolve in
`zerops.yml`:

| Variable | Where it comes from |
|---|---|
| `NEO4J_URI` | Neo4j AuraDB console — free tier, `neo4j+s://<id>.databases.neo4j.io` (Zerops has no managed graph DB, so this stays external, same as the local `docker-compose` setup) |
| `NEO4J_USER` | AuraDB console (usually `neo4j`) |
| `NEO4J_PASSWORD` | Set when you create the AuraDB instance — shown once, save it |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys (test mode: `sk_test_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe dashboard → Developers → Webhooks → add endpoint `https://<api-domain>/api/v1/webhooks/stripe`, subscribe to `payment_intent.succeeded`, copy the signing secret it gives you (`whsec_...`) |
| `STRIPE_QUARANTINE_DESTINATION` | A Stripe Connect test account ID, if you're wiring up the quarantine-transfer demo; leave blank otherwise — the app degrades gracefully |
| `ALLOWED_ORIGINS` | Your Vercel production URL once you have it, e.g. `https://erva.vercel.app` |
| `ALLOWED_ORIGIN_REGEX` | Optional — e.g. `https://erva-.*\.vercel\.app` to also allow every Vercel preview deployment without listing each one |

## 3. Seed the deployed database

From your machine, pointed at the deployed API and Postgres:

```bash
POSTGRES_URL=<db_connectionString from the Zerops dashboard> \
API_BASE_URL=https://<api-domain>/api/v1 \
python scripts/seed.py
python scripts/train_anomaly_model.py   # writes backend/models/*.joblib — commit these, or re-run after each deploy
```

Note `backend/models/isolation_forest.joblib` and `scaler.joblib` are checked into the repo
already (that's the validated model — see `docs/VALIDATION_METRICS_CARD.md`), so this step is
only needed if you want to retrain rather than ship the existing validated model as-is.

## 4. What's deliberately not here

- No Dockerfile changes — `backend/Dockerfile` is for local `docker-compose` only; Zerops builds
  from source via `zerops.yml`, not the Dockerfile.
- No Neo4j service — Zerops doesn't offer a managed graph database, so AuraDB stays the graph
  store in every environment, local and deployed alike.
