# ERVA — Entity Risk & Verification Analytics

> **Built for QuantumHacks 2026** (Devpost, hosted by ML Empowerment Foundation)
> **Team:** Henry

AI-powered fraud-ring detection that maps financial transaction networks, scores entity
trustworthiness, and generates regulator-ready reports — with a quantum-inspired optimization
layer for isolating the tightest fraud rings inside flagged clusters.

---

## The Problem

Financial fraud increasingly hides in **networks**, not single transactions — shell companies,
layered transfer chains, coordinated cash-out rings that each look innocent in isolation.
Traditional fraud systems flag individual transactions; they miss the network structure that
makes coordinated fraud possible. In Nigeria alone, financial fraud costs an estimated ₦50B+
annually — and the pattern generalizes to any economy with real-time payment rails.

## What ERVA Does

1. **Ingest** — transaction events arrive via a payment processor webhook or manual upload
2. **Resolve** — entity deduplication using **BVN** and **NIN** (Nigeria's biometric ID
   numbers — the equivalent of a Social Security Number) matching, plus fuzzy name matching
3. **Model** — a live relationship graph built in Neo4j (entities + transaction edges)
4. **Detect** — heuristic + Isolation Forest anomaly detection flags suspicious clusters
   (validated: 0.833 precision / 0.698 recall / 0.7595 F1 on a tuned threshold — see
   [`docs/VALIDATION_METRICS_CARD.md`](docs/VALIDATION_METRICS_CARD.md))
5. **Isolate** — flagged clusters are re-analyzed with a quantum-inspired QUBO solver
   (simulated annealing, classical hardware) that partitions the subgraph to find the tightest
   fraud ring, benchmarked against the classical heuristic result
6. **Score** — every entity gets an ERVA Trust Score (0–100%) with full reasoning
7. **Report** — an LLM drafts a regulator-ready **STR** (Suspicious Transaction Report — a
   mandatory regulatory filing when fraud is confirmed), submitted to the **NFIU** (Nigeria's
   Financial Intelligence Unit, the regulator that receives these filings) — with a human always
   reviewing before filing. Reports are never auto-filed.

## Why the Quantum Layer

Heuristic fraud-ring detection (`backend/app/services/detection_service.py`) uses fixed
thresholds — fan-in/fan-out counts, round-amount flags, degree counts. Thresholds don't scale
cleanly and are hard to defend as "correct." ERVA reformulates ring isolation as a
graph-partitioning optimization problem — expressed as a **QUBO** (Quadratic Unconstrained
Binary Optimization, the standard input format for quantum annealers) — and solves it with a
**quantum-inspired simulated annealer** (`dimod` + `dwave-neal`).

This runs on classical hardware today — no quantum hardware access required, and we say so
plainly — using the same optimization approach real quantum annealers apply to their problems.
It gives a second, independent, benchmarkable signal alongside the classical heuristic: on a
flagged alert's subgraph, the QUBO solver commonly isolates a ring with **fewer cross-partition
edges** (a tighter, less noisy ring) than the greedy classical baseline, at a real but small
timing cost (single-digit milliseconds on a toy-scale subgraph of a few dozen nodes — not the
full transaction graph). See it live: open any alert with a detected pattern and click
**Run Quantum Isolation**.

If `dimod`/`dwave-neal` are ever unavailable in a given environment, the service degrades
gracefully to a pure-Python simulated annealer solving the identical objective — labeled
honestly in the API response as a fallback, never silently substituted.

## Tech Stack

```
Frontend    React 18 + Vite · TanStack Query · D3.js graph viz · Tailwind CSS
Backend     FastAPI (Python) · SQLAlchemy · Pydantic · Celery workers
Databases   PostgreSQL (transactions) · Neo4j AuraDB (graph) · Redis (job queue)
ML/AI       scikit-learn Isolation Forest · dimod/dwave-neal QUBO simulated annealing
            · Groq llama-3.3-70b-versatile (STR drafting)
```

## Validated Results

- Isolation Forest, tuned threshold: **precision 0.833 / recall 0.698 / F1 0.7595**
  on a 2,000-transaction synthetic dataset with 43 embedded fraud patterns — fully reproducible:
  ```bash
  python scripts/evaluate_anomaly_model.py
  ```
- Quantum-inspired ring isolation: run `POST /api/v1/alerts/{id}/quantum-isolate` against any
  flagged alert to get a live classical-vs-quantum-inspired comparison (ring size,
  cross-partition edges, average intra-ring anomaly score, solve time for both methods) —
  numbers are computed live from your own seeded data, not hardcoded.

---

## How It Works

```
Payment event → Webhook/Upload → Ingest → Neo4j Graph → Pattern Detection
    → Anomaly Scoring → Quantum-Inspired Ring Isolation → Trust Score → STR Draft → Enforcement
```

## Payment Processor Integration

ERVA ingests live transaction events via [Stripe](https://stripe.com) webhooks, verified with
Stripe's official `stripe.Webhook.construct_event` flow (not a hand-rolled HMAC check — see
[`docs/STRIPE_BACKEND_INTEGRATION.md`](docs/STRIPE_BACKEND_INTEGRATION.md)), and can trigger a
test-mode Transfer once a Suspicious Transaction Report is approved and filed.

| Integration | Endpoint | Purpose |
|-------------|----------|---------|
| Webhook Ingestion | `POST /api/v1/webhooks/stripe` | Receives Stripe payment events, signature-verified |
| Simulate | `POST /api/v1/webhooks/stripe/simulate` | Demo fallback — injects a fraud chain without a real Stripe event |
| Quantum Isolation | `POST /api/v1/alerts/{id}/quantum-isolate` | Classical-vs-quantum-inspired ring comparison |

Live demo flow: `stripe listen --forward-to localhost:8000/api/v1/webhooks/stripe`, then
`stripe trigger payment_intent.succeeded` — a real, correctly-signed Stripe event landing in
the running backend, not an internally fabricated one.

## AI & Intelligence Layer

| Component | Technology | Role |
|-----------|-----------|------|
| Graph Pattern Detection | Heuristics over Neo4j graph stats | Shell Director Web, Layered Transfer Chain, POS Cash-Out Ring |
| Anomaly Detection | Isolation Forest (scikit-learn) | Statistical outlier scoring on 6 transaction features |
| Ring Isolation | QUBO + quantum-inspired simulated annealing | Second, independent signal for the tightest core ring in a flagged cluster |
| Trust Score | Network risk propagation | Aggregates alert risk across entity connection graph |
| STR Generation | Groq `llama-3.3-70b-versatile` | NFIU-compliant narrative drafting with regulatory framing |
| Responsible AI | False positive tracking | Bias monitoring, model feature list, immutable audit trail |

### Anomaly Model Features
`amount_ngn` · `hour_of_day` · `day_of_week` · `sender_degree` · `receiver_fan_in` · `is_round_amount`

Train locally:
```bash
python scripts/train_anomaly_model.py
# Writes backend/models/isolation_forest.joblib + backend/models/scaler.joblib
```

---

## Setup & Run

### Prerequisites
- Python 3.11+, Node 18+
- PostgreSQL, Redis, Neo4j (or use cloud managed services)

### Backend
```bash
cd backend
pip install -r requirements.txt
cp ../.env.example .env        # fill in secrets (see table below)
uvicorn app.main:app --reload --port 8000
```

### Worker
```bash
cd backend
python -m app.workers.ingest_worker
```

### Frontend
```bash
cd erva-frontend
npm install
echo "VITE_API_BASE_URL=http://localhost:8000/api/v1" > .env
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `NEO4J_URI` | Neo4j Bolt URI (`neo4j+s://...`) |
| `NEO4J_USER` | Neo4j username |
| `NEO4J_PASSWORD` | Neo4j password |
| `GROQ_API_KEY` | Groq API key for STR generation |
| `STRIPE_SECRET_KEY` | Stripe API key (test mode) |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for webhook signature verification |
| `STRIPE_QUARANTINE_DESTINATION` | Stripe Connect account ID for quarantine transfers (test mode) |

### Seed demo data
```bash
python scripts/seed.py
python scripts/train_anomaly_model.py
```

---

## Deployment

Backend on [Zerops](https://zerops.io), frontend on [Vercel](https://vercel.com), graph store on
Neo4j AuraDB (Zerops has no managed graph database, so this stays external in every environment).

**Backend (Zerops):** full walkthrough in
[`docs/ZEROPS_DEPLOYMENT.md`](docs/ZEROPS_DEPLOYMENT.md) — the repo-root
[`zerops.yml`](zerops.yml) drives the `api` and `worker` service builds automatically once the
repo is connected; a project-import YAML in that doc provisions Postgres, Valkey (Redis), and
both services in one step.

**Frontend (Vercel):**
1. Import the repo as a new Vercel project
2. Project Settings → **Root Directory** → `erva-frontend` (this is a monorepo — Vercel won't
   find `package.json` at the repo root)
3. Framework preset: Vite (auto-detected); build command and output directory are also
   auto-detected (`npm run build`, `dist`)
4. Project Settings → **Environment Variables** → `VITE_API_BASE_URL` = your Zerops `api` service
   URL + `/api/v1`, e.g. `https://api-xxxx.prg1.zerops.app/api/v1`
5. `erva-frontend/vercel.json` already has the SPA rewrite (`/* → /index.html`) needed for
   client-side routing — no changes needed there

**Wiring the two together:** once both are deployed, set `ALLOWED_ORIGINS` (and optionally
`ALLOWED_ORIGIN_REGEX` for Vercel preview URLs) on the Zerops `api` service to your real Vercel
domain(s) — the backend rejects cross-origin requests from anything not on that list.

---

## API Reference

Interactive docs at `/docs`. Key endpoints:

```
GET  /api/v1/health
GET  /api/v1/entities?q=<search>              Entity search (name, BVN, NIN, CAC)
GET  /api/v1/entities/{id}/risk               ERVA Trust Score + reasoning
GET  /api/v1/alerts                           Fraud alerts with risk scores
POST /api/v1/alerts/{id}/quantum-isolate      Quantum-inspired vs. classical ring isolation
GET  /api/v1/graph                            Full relationship graph (nodes + links)
GET  /api/v1/transactions/recent              Live transaction feed
POST /api/v1/str/generate                     Generate NFIU-compliant STR draft (Groq)
POST /api/v1/webhooks/stripe                  Stripe webhook (signature verified)
POST /api/v1/webhooks/stripe/simulate         Inject test transaction (demo fallback)
GET  /api/v1/responsible-ai/metrics           Model fairness & performance metrics
GET  /api/v1/audit                            Immutable compliance audit trail
```

---

## Repository Structure

```
erva-frontend/          React dashboard (Vite)
backend/
  app/
    api/routes/         FastAPI route handlers
    models/              SQLAlchemy ORM + enums
    schemas/             Pydantic request/response schemas
    services/             Business logic (ingest, graph, detection, quantum ring isolation)
    workers/               Async ingest job processor
  scripts/               Seed data + model training
data/                    Synthetic dataset generation
docs/                    Implementation notes & runbooks
```

---

## The Pitch

> *"ERVA watches every transaction from any connected payment processor for fraud patterns in
> real time. When a fraud ring is confirmed, ERVA re-isolates it with a quantum-inspired
> optimizer, generates the regulatory report, and hands it to a human analyst for review — the
> network finds the ring, the analyst decides what happens next."*

---

*Built for QuantumHacks 2026 · © 2026*
