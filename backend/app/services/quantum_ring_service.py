"""Quantum-inspired fraud-ring isolation.

Reformulates "which entities form the tightest fraud ring inside a flagged
alert" as a graph-partitioning QUBO (Quadratic Unconstrained Binary
Optimization) and solves it with a quantum-inspired simulated annealer
(dwave-neal, running on classical hardware — no quantum hardware access
required). This is a second, independent signal alongside the classical
fan-in/fan-out heuristic already used in detection_service.py, benchmarked
against it on the same subgraph.

If dimod/neal are unavailable, falls back to a pure-Python simulated
annealer solving the identical objective, labeled honestly in the response.
"""

from __future__ import annotations

import random
import time
import uuid
from typing import Iterable

import networkx as nx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Alert, Entity, Transaction
from app.services.anomaly_service import score_transaction

try:
    import dimod
    from dimod.generators import combinations
    from neal import SimulatedAnnealingSampler

    _DIMOD_AVAILABLE = True
except ImportError:  # pragma: no cover - exercised only when deps are missing
    _DIMOD_AVAILABLE = False

SIZE_PENALTY_MULTIPLIER = 2.0
NUM_READS = 50
ANNEAL_SEED = 42


def _build_subgraph(db: Session, alert: Alert) -> nx.Graph:
    """Build a weighted graph from an alert's entities/transactions.

    Edge weight is the anomaly-model confidence for that transaction
    (0-1, higher = more suspicious), reusing the trained Isolation Forest
    so the ring-isolation signal is grounded in the same model that
    produced the alert in the first place.
    """
    tx_ids = [uuid.UUID(str(x)) for x in alert.transaction_ids]
    txs = db.scalars(select(Transaction).where(Transaction.id.in_(tx_ids))).all()

    graph = nx.Graph()
    for entity_id in alert.entity_ids:
        graph.add_node(str(entity_id))

    degree_count: dict[str, int] = {}
    for tx in txs:
        degree_count[str(tx.source_entity_id)] = degree_count.get(str(tx.source_entity_id), 0) + 1
        degree_count[str(tx.destination_entity_id)] = degree_count.get(str(tx.destination_entity_id), 0) + 1

    for tx in txs:
        src, dst = str(tx.source_entity_id), str(tx.destination_entity_id)
        if src == dst:
            continue
        graph.add_node(src)
        graph.add_node(dst)

        summary = score_transaction(
            {"amount_ngn": float(tx.amount), "occurred_at": tx.occurred_at},
            sender_degree=degree_count.get(src, 1),
            receiver_fan_in=degree_count.get(dst, 1),
        )
        weight = float(summary["confidence"])

        if graph.has_edge(src, dst):
            existing = graph[src][dst]
            existing["weight"] = max(existing["weight"], weight)
            existing["tx_count"] += 1
        else:
            graph.add_edge(src, dst, weight=weight, tx_count=1)

    return graph


def _target_ring_size(n: int) -> int:
    if n <= 3:
        return n
    return max(3, min(n, round(n * 0.55)))


def _cross_partition_edges(graph: nx.Graph, ring: set[str]) -> int:
    return sum(1 for u, v in graph.edges() if (u in ring) != (v in ring))


def _avg_intra_partition_score(graph: nx.Graph, ring: set[str]) -> float:
    weights = [
        data["weight"] for u, v, data in graph.edges(data=True) if u in ring and v in ring
    ]
    return round(sum(weights) / len(weights), 4) if weights else 0.0


def _greedy_classical_baseline(graph: nx.Graph, target_size: int) -> tuple[set[str], float]:
    """Classical heuristic: take the top-N nodes by weighted degree."""
    start = time.perf_counter()
    weighted_degree = {
        node: sum(data["weight"] for _, _, data in graph.edges(node, data=True))
        for node in graph.nodes()
    }
    ranked = sorted(graph.nodes(), key=lambda n: weighted_degree.get(n, 0.0), reverse=True)
    ring = set(ranked[:target_size])
    elapsed_ms = (time.perf_counter() - start) * 1000
    return ring, elapsed_ms


def _qubo_bqm(graph: nx.Graph, target_size: int) -> "dimod.BinaryQuadraticModel":
    nodes = list(graph.nodes())
    edge_weights = {}
    for u, v, data in graph.edges(data=True):
        edge_weights[(u, v)] = data["weight"]

    max_weight = max(edge_weights.values(), default=1.0) or 1.0
    penalty_strength = SIZE_PENALTY_MULTIPLIER * max_weight

    bqm = dimod.BinaryQuadraticModel(vartype="BINARY")
    for node in nodes:
        bqm.add_variable(node, 0.0)
    for (u, v), w in edge_weights.items():
        bqm.add_quadratic(u, v, -w)

    if nodes:
        bqm += combinations(nodes, target_size, strength=penalty_strength)
    return bqm


def _qubo_quantum_inspired(graph: nx.Graph, target_size: int) -> tuple[set[str], float, float]:
    """Solve the ring-isolation QUBO with a quantum-inspired simulated annealer."""
    start = time.perf_counter()
    bqm = _qubo_bqm(graph, target_size)
    sampler = SimulatedAnnealingSampler()
    sampleset = sampler.sample(bqm, num_reads=NUM_READS, seed=ANNEAL_SEED)
    best = sampleset.first
    elapsed_ms = (time.perf_counter() - start) * 1000
    ring = {node for node, value in best.sample.items() if value == 1}
    return ring, elapsed_ms, float(best.energy)


def _simulated_annealing_fallback(
    graph: nx.Graph, target_size: int
) -> tuple[set[str], float, float]:
    """Pure-Python simulated annealer for the same objective, used only when
    dimod/neal are not installed. Same math as the QUBO path, no dimod
    dependency — documented graceful degradation, not a hidden substitute.
    """
    start = time.perf_counter()
    nodes = list(graph.nodes())
    edge_weight = {(u, v): d["weight"] for u, v, d in graph.edges(data=True)}

    def weight_of(u: str, v: str) -> float:
        return edge_weight.get((u, v), edge_weight.get((v, u), 0.0))

    max_weight = max(edge_weight.values(), default=1.0) or 1.0
    penalty_strength = SIZE_PENALTY_MULTIPLIER * max_weight

    def energy(ring: set[str]) -> float:
        edge_term = -sum(
            w for (u, v), w in edge_weight.items() if u in ring and v in ring
        )
        size_term = penalty_strength * (len(ring) - target_size) ** 2
        return edge_term + size_term

    rng = random.Random(ANNEAL_SEED)
    current = set(rng.sample(nodes, min(target_size, len(nodes)))) if nodes else set()
    current_energy = energy(current)
    best, best_energy = set(current), current_energy

    temperature = 1.0
    cooling_rate = 0.95
    steps_per_temp = max(10, len(nodes) * 2)

    for _ in range(NUM_READS):
        for _ in range(steps_per_temp):
            if not nodes:
                break
            node = rng.choice(nodes)
            candidate = set(current)
            if node in candidate:
                candidate.remove(node)
            else:
                candidate.add(node)
            candidate_energy = energy(candidate)
            delta = candidate_energy - current_energy
            if delta < 0 or rng.random() < pow(2.71828, -delta / max(temperature, 1e-6)):
                current, current_energy = candidate, candidate_energy
                if current_energy < best_energy:
                    best, best_energy = set(current), current_energy
        temperature *= cooling_rate

    elapsed_ms = (time.perf_counter() - start) * 1000
    return best, elapsed_ms, best_energy


def isolate_ring(db: Session, alert: Alert) -> dict:
    graph = _build_subgraph(db, alert)
    n = graph.number_of_nodes()
    target_size = _target_ring_size(n)

    classical_ring, classical_ms = _greedy_classical_baseline(graph, target_size)

    if _DIMOD_AVAILABLE and n > 0:
        quantum_ring, quantum_ms, energy = _qubo_quantum_inspired(graph, target_size)
        solver_label = "qubo_simulated_annealing (dimod + neal)"
    else:
        quantum_ring, quantum_ms, energy = _simulated_annealing_fallback(graph, target_size)
        solver_label = "simulated_annealing_fallback (dimod/neal unavailable)"

    entity_ids = {str(x) for x in alert.entity_ids} | set(graph.nodes())
    entities = db.scalars(
        select(Entity).where(Entity.id.in_([uuid.UUID(e) for e in entity_ids]))
    ).all()
    names = {str(e.id): e.full_name for e in entities}

    subgraph_nodes = [{"id": node, "name": names.get(node)} for node in graph.nodes()]
    subgraph_edges = [
        {"source": u, "target": v, "weight": round(data["weight"], 4), "tx_count": data["tx_count"]}
        for u, v, data in graph.edges(data=True)
    ]

    def _partition_payload(ring: set[str], solve_ms: float, method: str, extra: dict | None = None) -> dict:
        payload = {
            "method": method,
            "ring_entity_ids": sorted(ring),
            "ring_entities": [
                {"id": eid, "name": names.get(eid)} for eid in sorted(ring)
            ],
            "ring_size": len(ring),
            "cross_partition_edges": _cross_partition_edges(graph, ring),
            "avg_intra_partition_anomaly_score": _avg_intra_partition_score(graph, ring),
            "solve_time_ms": round(solve_ms, 3),
        }
        if extra:
            payload.update(extra)
        return payload

    classical_payload = _partition_payload(classical_ring, classical_ms, "greedy_max_weighted_degree")
    quantum_payload = _partition_payload(
        quantum_ring, quantum_ms, solver_label, extra={"qubo_energy": round(energy, 4)}
    )

    if quantum_payload["cross_partition_edges"] < classical_payload["cross_partition_edges"]:
        tighter = "quantum_inspired"
    elif quantum_payload["cross_partition_edges"] > classical_payload["cross_partition_edges"]:
        tighter = "classical"
    else:
        tighter = "tie"

    summary = (
        f"Classical heuristic isolated a {classical_payload['ring_size']}-entity ring "
        f"with {classical_payload['cross_partition_edges']} cross-partition edges in "
        f"{classical_payload['solve_time_ms']:.2f}ms. Quantum-inspired QUBO solver isolated a "
        f"{quantum_payload['ring_size']}-entity ring with {quantum_payload['cross_partition_edges']} "
        f"cross-partition edges in {quantum_payload['solve_time_ms']:.2f}ms."
    )

    return {
        "alert_id": str(alert.id),
        "subgraph": {
            "node_count": n,
            "edge_count": graph.number_of_edges(),
            "nodes": subgraph_nodes,
            "edges": subgraph_edges,
        },
        "target_ring_size": target_size,
        "classical": classical_payload,
        "quantum_inspired": quantum_payload,
        "comparison": {"tighter_ring": tighter, "summary": summary},
    }
