import { EvidenceTag } from '@/components/ui/EvidenceTag'

const config = {
  OPEN:       { label: 'OPEN',       variant: 'risk' },
  IN_REVIEW:  { label: 'IN REVIEW',  variant: 'neutral' },
  STR_FILED:  { label: 'STR FILED',  variant: 'trust' },
  DISMISSED:  { label: 'DISMISSED',  variant: 'neutral' },
  PENDING:    { label: 'PENDING',    variant: 'risk' },
  APPROVED:   { label: 'APPROVED',   variant: 'trust' },
  REJECTED:   { label: 'REJECTED',   variant: 'neutral' },
  FILED:      { label: 'FILED',      variant: 'trust' },
}

export function StatusBadge({ status }) {
  const { label, variant } = config[status] ?? { label: status, variant: 'neutral' }
  return <EvidenceTag label={label} variant={variant} />
}
