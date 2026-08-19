import { useState } from 'react'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { alertsApi } from '@/api/alerts'
import { toast } from '@/store/toastStore'

function toGraphData(subgraph, ringIds) {
  const ring = new Set(ringIds)
  const nodes = (subgraph?.nodes ?? []).map((n) => ({
    id: n.id,
    label: n.name ?? n.id,
    risk: ring.has(n.id) ? 'HIGH' : 'NONE',
  }))
  const links = (subgraph?.edges ?? []).map((e) => ({
    source: e.source,
    target: e.target,
    value: Math.max(20, e.weight * 100),
  }))
  return { nodes, links }
}

function PartitionCard({ title, subtitle, partition, subgraph, navigate }) {
  const { nodes, links } = toGraphData(subgraph, partition.ring_entity_ids)
  return (
    <div className="bg-[#0D1117] border border-[#2D3748] rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-[#2D3748] flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-[#F7F9FC]">{title}</p>
          <p className="text-[10px] text-[#4B5563]">{subtitle}</p>
        </div>
        <span className="text-[10px] font-mono text-[#4B5563]">{partition.solve_time_ms}ms</span>
      </div>
      <GraphCanvas
        nodes={nodes}
        links={links}
        height={220}
        onNodeClick={(n) => navigate?.(`/entities/${n.id}`)}
      />
      <div className="grid grid-cols-3 divide-x divide-[#2D3748] border-t border-[#2D3748]">
        <div className="px-3 py-2 text-center">
          <p className="text-sm font-mono font-semibold text-[#F7F9FC]">{partition.ring_size}</p>
          <p className="text-[9px] text-[#4B5563] uppercase tracking-wider">Isolated</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-sm font-mono font-semibold text-[#F7F9FC]">{partition.cross_partition_edges}</p>
          <p className="text-[9px] text-[#4B5563] uppercase tracking-wider">Cross-Edges</p>
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-sm font-mono font-semibold text-[#F7F9FC]">{partition.avg_intra_partition_anomaly_score}</p>
          <p className="text-[9px] text-[#4B5563] uppercase tracking-wider">Avg Anomaly</p>
        </div>
      </div>
    </div>
  )
}

export function QuantumIsolationPanel({ alertId, navigate }) {
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleRun = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await alertsApi.quantumIsolate(alertId)
      setResult(data)
    } catch (err) {
      console.error(err)
      setError('Quantum isolation failed — see console for details')
      toast.error('Quantum isolation failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#111827] border border-[#2D3748] rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-[#4B5563] uppercase tracking-wider">Quantum Isolation</p>
        {!result && (
          <Button variant="secondary" onClick={handleRun} loading={loading}>
            {loading ? 'Isolating Ring…' : 'Run Quantum Isolation'}
          </Button>
        )}
      </div>
      <p className="text-[11px] text-[#4B5563] mb-3">
        Reformulates ring isolation as a quantum-inspired QUBO optimization, solved with simulated
        annealing on classical hardware, and benchmarks it against the classical fan-in/fan-out heuristic
        on this alert's subgraph.
      </p>

      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      {loading && (
        <div className="flex justify-center py-8"><Spinner /></div>
      )}

      {result && (
        <div>
          <div className="grid md:grid-cols-2 gap-4 mb-3">
            <PartitionCard
              title="Classical Heuristic"
              subtitle={result.classical.method}
              partition={result.classical}
              subgraph={result.subgraph}
              navigate={navigate}
            />
            <PartitionCard
              title="Quantum-Inspired"
              subtitle={result.quantum_inspired.method}
              partition={result.quantum_inspired}
              subgraph={result.subgraph}
              navigate={navigate}
            />
          </div>
          <div className="bg-[#0D1117] border border-[#2D3748] rounded-md px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-[#94A3B8]">{result.comparison.summary}</p>
            <Button variant="ghost" onClick={handleRun} loading={loading}>
              Re-run
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
