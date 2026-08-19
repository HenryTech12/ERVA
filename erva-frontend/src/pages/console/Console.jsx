import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { GraphCanvas } from '@/components/graph/GraphCanvas'
import { GraphControls } from '@/components/graph/GraphControls'
import { useGraphLayout } from '@/components/graph/useGraphLayout'
import { CaseRail } from '@/components/console/CaseRail'
import { Inspector } from '@/components/console/Inspector'
import { useGraph } from '@/hooks/useGraph'
import { useAlerts } from '@/hooks/useAlerts'
import { useEntityTotal } from '@/hooks/useEntities'
import { useSimulationStore } from '@/store/simulationStore'
import { deriveRiskLevel } from '@/utils/risk'
import { Spinner } from '@/components/ui/Spinner'
import { Button } from '@/components/ui/Button'

function useFullGraph() {
  const { data: graphData, isLoading: graphLoading } = useGraph()
  const { data: alerts = [] } = useAlerts()

  const { rawNodes, rawLinks } = useMemo(() => {
    const nodes = graphData?.nodes ?? []
    const links = graphData?.links ?? []

    const riskMap = new Map()
    alerts.forEach((alert) => {
      const level = alert.riskLevel ?? deriveRiskLevel(alert.riskScore ?? 0)
      ;(alert.entityIds ?? []).forEach((id) => {
        const current = riskMap.get(id)
        if (!current || level === 'HIGH' || (level === 'MEDIUM' && current === 'LOW')) {
          riskMap.set(id, level)
        }
      })
    })

    const normNodes = nodes
      .filter((n) => n.id)
      .map((n) => ({
        id: n.id,
        label: n.label ?? n.id,
        type: n.type ?? 'account',
        risk: riskMap.get(n.id) ?? 'LOW',
      }))

    const nodeIds = new Set(normNodes.map((n) => n.id))
    const normLinks = links
      .filter((l) => l.source && l.target && nodeIds.has(l.source) && nodeIds.has(l.target))
      .map((l) => ({ source: l.source, target: l.target, value: parseFloat(l.amount ?? 50) }))

    return { rawNodes: normNodes, rawLinks: normLinks }
  }, [graphData, alerts])

  return { rawNodes, rawLinks, isLoading: graphLoading }
}

export default function Console() {
  const navigate = useNavigate()
  const [riskFilter, setRiskFilter] = useState('ALL')
  const [selectedNode, setSelectedNode] = useState(null)
  const [selectedAlertId, setSelectedAlertId] = useState(null)
  const [key, setKey] = useState(0)

  const { data: alerts, isLoading: alertsLoading } = useAlerts()
  const { data: entityTotal } = useEntityTotal()
  const { rawNodes, rawLinks, isLoading: graphLoading } = useFullGraph()
  const { nodes, links } = useGraphLayout(riskFilter, { nodes: rawNodes, links: rawLinks })

  const { highlightedNodeId, triggeredAlert, clearSimulation } = useSimulationStore()

  const patchedNodes = useMemo(() => {
    if (!highlightedNodeId) return nodes
    return nodes.map((n) => (n.id === highlightedNodeId ? { ...n, risk: 'HIGH', _simHighlight: true } : n))
  }, [nodes, highlightedNodeId])

  useEffect(() => {
    if (!highlightedNodeId) return
    const node = patchedNodes.find((n) => n.id === highlightedNodeId)
    if (node) setSelectedNode(node)
    if (triggeredAlert?.id) setSelectedAlertId(triggeredAlert.id)
  }, [highlightedNodeId, patchedNodes, triggeredAlert])

  useEffect(() => () => clearSimulation(), [clearSimulation])

  const openAlerts = (alerts ?? []).filter((a) => a.status === 'OPEN')

  const handleSelectAlert = (alert) => {
    setSelectedAlertId(alert.id)
    const firstEntityId = alert.entityIds?.[0]
    const node = firstEntityId ? patchedNodes.find((n) => n.id === firstEntityId) : null
    if (node) setSelectedNode(node)
  }

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#26314D] bg-[#131B2E]">
        <div>
          <h1 className="text-sm font-display font-semibold text-[#E8EAF0]">Investigation Console</h1>
          <p className="text-[10px] text-[#8891A8] font-mono">
            {nodes.length} nodes · {links.length} edges · {entityTotal ?? '…'} entities monitored
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/ingest')}>
          Live Ingest Demo →
        </Button>
      </div>

      <GraphControls
        riskFilter={riskFilter}
        onRiskFilterChange={(r) => { setRiskFilter(r); setKey((k) => k + 1) }}
        onReset={() => { setRiskFilter('ALL'); setKey((k) => k + 1) }}
      />

      <div className="flex flex-1 overflow-hidden min-h-0">
        <CaseRail
          alerts={openAlerts}
          isLoading={alertsLoading}
          selectedAlertId={selectedAlertId}
          onSelectAlert={handleSelectAlert}
          entityCount={entityTotal}
          openCount={openAlerts.length}
        />

        <div className="flex-1 bg-[#0B1220] relative min-h-0">
          {graphLoading ? (
            <div className="flex items-center justify-center h-full"><Spinner size="lg" /></div>
          ) : nodes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-[#8891A8]">
              <p className="text-sm">No graph data available</p>
              <p className="text-xs font-mono">Ingest transactions to build the entity graph</p>
            </div>
          ) : (
            <GraphCanvas
              key={key}
              nodes={patchedNodes}
              links={links}
              onNodeClick={(n) => { setSelectedNode(n); setSelectedAlertId(null) }}
            />
          )}

          <div className="absolute bottom-4 left-4 bg-[#131B2E]/90 border border-[#26314D] rounded-lg p-3 flex flex-col gap-1.5">
            {[['HIGH / MEDIUM', '#E8A33D'], ['LOW', '#4FA0A0']].map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border-2" style={{ borderColor: color, backgroundColor: color + '33' }} />
                <span className="text-[10px] text-[#8891A8] font-mono">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedNode && (
          <Inspector node={selectedNode} onClose={() => { setSelectedNode(null); setSelectedAlertId(null) }} />
        )}
      </div>
    </div>
  )
}
