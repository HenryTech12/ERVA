import { EvidenceTag } from '@/components/ui/EvidenceTag'

const config = {
  HIGH:   { label: 'HIGH',   variant: 'risk' },
  MEDIUM: { label: 'MED',    variant: 'risk' },
  LOW:    { label: 'LOW',    variant: 'trust' },
  NONE:   { label: 'NONE',   variant: 'neutral' },
}

export function RiskBadge({ level }) {
  const { label, variant } = config[level] ?? config.NONE
  return <EvidenceTag label={label} variant={variant} />
}
