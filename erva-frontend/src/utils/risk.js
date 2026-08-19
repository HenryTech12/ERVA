export function deriveRiskLevel(score) {
  const n = parseFloat(score)
  if (n >= 0.7) return 'HIGH'
  if (n >= 0.4) return 'MEDIUM'
  return 'LOW'
}

export function riskColor(score) {
  const level = deriveRiskLevel(score)
  if (level === 'HIGH') return '#e8a33d'
  if (level === 'MEDIUM') return '#e8a33d'
  return '#4fa0a0'
}
