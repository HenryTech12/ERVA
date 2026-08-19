import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

// A genuinely live, force-simulated miniature of ERVA's relationship graph —
// the actual mechanic (d3-force, same as the real console), not a hand-drawn
// decorative SVG. Runs a small representative fraud-ring subset and keeps a
// low idle alphaTarget so it never fully settles — a gentle, continuous drift.
const NODES = [
  { id: 'entry-1', risk: 'trust' }, { id: 'entry-2', risk: 'trust' }, { id: 'entry-3', risk: 'trust' },
  { id: 'feeder-1', risk: 'risk' }, { id: 'feeder-2', risk: 'risk' },
  { id: 'feeder-3', risk: 'risk' }, { id: 'feeder-4', risk: 'risk' },
  { id: 'ring-1', risk: 'risk' }, { id: 'ring-2', risk: 'risk' },
  { id: 'ring-3', risk: 'risk' }, { id: 'ring-4', risk: 'risk' },
  { id: 'hub', risk: 'risk', hub: true },
]
const LINKS = [
  { source: 'entry-1', target: 'feeder-1' }, { source: 'entry-2', target: 'feeder-2' },
  { source: 'entry-3', target: 'ring-1' },
  { source: 'feeder-1', target: 'ring-1' }, { source: 'feeder-2', target: 'ring-2' },
  { source: 'feeder-3', target: 'ring-3' }, { source: 'feeder-4', target: 'ring-4' },
  { source: 'ring-1', target: 'hub' }, { source: 'ring-2', target: 'hub' },
  { source: 'ring-3', target: 'hub' }, { source: 'ring-4', target: 'hub' },
  { source: 'ring-1', target: 'ring-2' }, { source: 'ring-3', target: 'ring-4' },
]
const COLOR = { risk: '#E8A33D', trust: '#4FA0A0' }

export function HeroGraphLive() {
  const svgRef = useRef(null)

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const width = el.clientWidth || 600
    const height = el.clientHeight || 340

    d3.select(el).selectAll('*').remove()
    const svg = d3.select(el).attr('viewBox', `0 0 ${width} ${height}`)

    const defs = svg.append('defs')
    const filter = defs.append('filter').attr('id', 'hgl-glow').attr('x', '-60%').attr('y', '-60%').attr('width', '220%').attr('height', '220%')
    filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'blur')
    const merge = filter.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    const nodeData = NODES.map((n) => ({ ...n }))
    const linkData = LINKS.map((l) => ({ ...l }))

    const sim = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id((d) => d.id).distance(70).strength(0.6))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(24))
      .alphaDecay(reducedMotion ? 1 : 0.02)
      .alphaTarget(reducedMotion ? 0 : 0.04) // never fully settles — gentle perpetual drift

    const link = svg.append('g').selectAll('line').data(linkData).join('line')
      .attr('stroke', '#8891A8').attr('stroke-opacity', 0.3).attr('stroke-width', 1)

    const node = svg.append('g').selectAll('circle').data(nodeData).join('circle')
      .attr('r', (d) => (d.hub ? 13 : 8))
      .attr('fill', (d) => `${COLOR[d.risk]}22`)
      .attr('stroke', (d) => COLOR[d.risk])
      .attr('stroke-width', 2)
      .style('filter', (d) => (d.hub ? 'url(#hgl-glow)' : 'none'))

    sim.on('tick', () => {
      link.attr('x1', (d) => d.source.x).attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x).attr('y2', (d) => d.target.y)
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
    })

    return () => sim.stop()
  }, [])

  return <svg ref={svgRef} className="w-full h-full" role="img" aria-label="Live force-directed miniature of ERVA's entity relationship graph, showing a small fraud ring forming around a central hub" />
}
