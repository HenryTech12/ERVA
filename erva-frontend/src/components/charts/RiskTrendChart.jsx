import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts'
import { useAlerts } from '@/hooks/useAlerts'
import { Spinner } from '@/components/ui/Spinner'

const PATTERN_LABELS = {
  pos_cash_out_ring: 'POS Cash-Out Ring',
  shell_director_web: 'Shell Director Web',
  layered_transfer_chain: 'Layered Transfer Chain',
}

const MAX_BARS = 6

function truncateLabel(value) {
  if (!value) return ''
  return value.length > 22 ? `${value.slice(0, 22)}...` : value
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="bg-[#1B2540] border border-[#26314D] rounded-lg p-3 text-xs">
      <p className="text-[#8891A8] mb-1">{d.name}</p>
      <p style={{ color: d.fill }}>Risk Score: {d.risk}/100</p>
    </div>
  )
}

export function RiskTrendChart() {
  const { data: alerts, isLoading } = useAlerts()

  if (isLoading) {
    return <div className="flex justify-center items-center h-[200px]"><Spinner /></div>
  }
  if (!alerts?.length) {
    return <div className="flex justify-center items-center h-[200px] text-[#8891A8] text-sm">No alerts detected yet</div>
  }

  const chartData = [...alerts]
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, MAX_BARS)
    .map((alert, index) => ({
      rank: `#${index + 1}`,
      name: PATTERN_LABELS[alert.patternType] ?? alert.patternType,
      risk: Math.round(alert.riskScore * 100),
      fill:
        alert.riskScore >= 0.7
          ? '#e8a33d'
          : alert.riskScore >= 0.4
          ? '#e8a33d'
          : '#4fa0a0',
    }))

  return (
    <div className="h-[250px] flex flex-col">
      <div className="flex items-center justify-between mb-3 text-[11px]">
        <p className="text-[#8891A8] uppercase tracking-wider">Top Risk Alerts</p>
        <p className="text-[#8891A8]">Showing {chartData.length} of {alerts.length}</p>
      </div>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 36, left: 0, bottom: 4 }}
            barCategoryGap="28%"
          >
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fill: '#8891A8', fontSize: 10 }}
              tickCount={6}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              tickFormatter={truncateLabel}
              tick={{ fill: '#8891A8', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={156}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="risk" radius={[4, 4, 4, 4]} barSize={14}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} fillOpacity={0.9} />
              ))}
              <LabelList
                dataKey="risk"
                position="right"
                style={{ fill: '#E8EAF0', fontSize: 10 }}
                formatter={(v) => `${v}%`}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
