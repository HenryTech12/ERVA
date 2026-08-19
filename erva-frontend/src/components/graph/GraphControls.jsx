export function GraphControls({ riskFilter, onRiskFilterChange, onReset }) {
  const risks = ['ALL', 'HIGH', 'MEDIUM', 'LOW']
  return (
    <div className="flex items-center gap-3 p-3 bg-[#131B2E] border-b border-[#26314D]">
      <span className="text-xs text-[#8891A8] uppercase tracking-wider">Risk Filter:</span>
      <div className="flex gap-1">
        {risks.map((r) => (
          <button
            key={r}
            onClick={() => onRiskFilterChange(r)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              riskFilter === r
                ? 'bg-[#4FA0A0]/20 text-[#4FA0A0] border border-[#4FA0A0]/40'
                : 'bg-[#1B2540] text-[#8891A8] border border-[#26314D] hover:text-[#E8EAF0]'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
      <button
        onClick={onReset}
        className="ml-auto px-3 py-1 rounded text-xs text-[#8891A8] border border-[#26314D] hover:text-[#E8EAF0] hover:bg-[#1B2540] transition-colors"
      >
        Reset View
      </button>
    </div>
  )
}
