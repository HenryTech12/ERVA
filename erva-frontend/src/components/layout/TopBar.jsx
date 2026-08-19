import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { BellIcon, MagnifyingGlassIcon, ArrowRightOnRectangleIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { apiClient } from '@/api/client'

function useGlobalSearch(q) {
  return useQuery({
    queryKey: ['global-search', q],
    queryFn: async () => {
      const [entities, alerts] = await Promise.all([
        apiClient.get(`/entities?q=${encodeURIComponent(q)}&limit=5`).then((r) => r.data.items ?? []),
        apiClient.get('/alerts').then((r) => {
          const all = r.data.alerts ?? r.data ?? []
          const lower = q.toLowerCase()
          return all.filter((a) =>
            a.pattern_type?.toLowerCase().includes(lower) ||
            a.reason?.toLowerCase().includes(lower)
          ).slice(0, 3)
        }),
      ])
      return { entities, alerts }
    },
    enabled: q.trim().length >= 2,
    staleTime: 15_000,
  })
}

export function TopBar() {
  const [search, setSearch] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [open, setOpen] = useState(false)
  const wrapperRef = useRef(null)
  const logout = useAuthStore((s) => s.logout)
  const notifications = useUIStore((s) => s.notifications)
  const clearNotifications = useUIStore((s) => s.clearNotifications)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const navigate = useNavigate()

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    setOpen(debouncedQ.length >= 2)
  }, [debouncedQ])

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data, isFetching } = useGlobalSearch(debouncedQ)
  const entities = data?.entities ?? []
  const alerts = data?.alerts ?? []
  const hasResults = entities.length > 0 || alerts.length > 0

  function go(path) {
    navigate(path)
    setSearch('')
    setOpen(false)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-[#0B1220] border-b border-[#26314D] flex flex-col shrink-0">
      {/* Brand gradient strip */}
      <div className="h-0.5 w-full brand-gradient-bg" />
    <div className="h-13 flex items-center px-4 lg:px-6 gap-3">
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-2 rounded-md text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#1B2540] transition-colors"
      >
        <Bars3Icon className="w-5 h-5" />
      </button>

      <div className="flex-1 max-w-md relative" ref={wrapperRef}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8891A8]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => debouncedQ.length >= 2 && setOpen(true)}
            onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
            placeholder="Search entities, BVN, alerts..."
            className="w-full bg-[#1B2540] border border-[#26314D] rounded-md pl-9 pr-4 py-1.5 text-sm text-[#E8EAF0] placeholder:text-[#8891A8] focus:outline-none focus:border-[#4FA0A0]/50 font-mono"
          />
          {isFetching && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 border border-[#4FA0A0] border-t-transparent rounded-full animate-spin" />
          )}
        </div>

        {open && (
          <div className="absolute top-full mt-1 w-full bg-[#131B2E] border border-[#26314D] rounded-lg shadow-xl z-50 overflow-hidden">
            {!hasResults && !isFetching && (
              <p className="px-4 py-3 text-xs text-[#8891A8]">No results for &quot;{debouncedQ}&quot;</p>
            )}

            {entities.length > 0 && (
              <div>
                <p className="px-4 pt-2 pb-1 text-[10px] text-[#8891A8] uppercase tracking-wider font-medium">Entities</p>
                {entities.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => go(`/entities/${e.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1B2540] transition-colors text-left"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#1B2540] border border-[#26314D] text-[#8891A8] font-mono shrink-0">
                      {(e.entity_type ?? 'ACCT').toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm text-[#E8EAF0] truncate">{e.full_name ?? e.id}</p>
                      <p className="text-[10px] text-[#8891A8] font-mono truncate">{e.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {alerts.length > 0 && (
              <div className="border-t border-[#26314D]">
                <p className="px-4 pt-2 pb-1 text-[10px] text-[#8891A8] uppercase tracking-wider font-medium">Alerts</p>
                {alerts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => go(`/alerts/${a.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1B2540] transition-colors text-left"
                  >
                    <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 font-mono shrink-0">ALERT</span>
                    <p className="text-sm text-[#E8EAF0] truncate">{(a.pattern_type ?? '').replace(/_/g, ' ')}</p>
                  </button>
                ))}
              </div>
            )}

            {hasResults && (
              <div className="border-t border-[#26314D] px-4 py-2">
                <button
                  onClick={() => go(`/entities?q=${encodeURIComponent(debouncedQ)}`)}
                  className="text-xs text-[#4FA0A0] hover:underline"
                >
                  See all entity results →
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 ml-auto">
        {/* QuantumHacks badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full brand-gradient-bg glow-brand">
          <span className="text-[10px] font-bold text-white tracking-wide uppercase">QuantumHacks 2026</span>
        </div>

        <button
          onClick={clearNotifications}
          className="relative p-2 rounded-md text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#131B2E] transition-colors"
        >
          <BellIcon className="w-4 h-4" />
          {notifications > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#4FA0A0] rounded-full" />
          )}
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-[#26314D]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#4FA0A0]/30 to-[#1F4747]/30 border border-[#4FA0A0]/30 flex items-center justify-center">
            <span className="text-xs font-semibold text-[#FF8560]">AO</span>
          </div>
          <span className="hidden sm:block text-sm text-[#8891A8]">Akeem Jr.</span>
          <button onClick={handleLogout} className="p-1 rounded text-[#8891A8] hover:text-red-400 transition-colors ml-1" title="Logout">
            <ArrowRightOnRectangleIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    </header>
  )
}
