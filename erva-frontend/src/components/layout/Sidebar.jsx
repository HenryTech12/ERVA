import { NavLink } from 'react-router-dom'
import {
  ChartBarIcon, BellAlertIcon, UserGroupIcon,
  DocumentTextIcon, ClipboardDocumentListIcon, Cog6ToothIcon, XMarkIcon,
  ArrowsRightLeftIcon, SignalIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/utils/cn'
import { useUIStore } from '@/store/uiStore'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  { to: '/dashboard',     icon: ChartBarIcon,              label: 'Console' },
  { to: '/alerts',        icon: BellAlertIcon,             label: 'Alerts' },
  { to: '/entities',      icon: UserGroupIcon,             label: 'Entities' },
  { to: '/transactions',  icon: ArrowsRightLeftIcon,       label: 'Transactions' },
  { to: '/ingest',        icon: SignalIcon,                label: 'Ingest Monitor' },
  { to: '/str',           icon: DocumentTextIcon,          label: 'STR Reports' },
  { to: '/audit',         icon: ClipboardDocumentListIcon, label: 'Audit Log' },
]

function SidebarContent({ onClose }) {
  return (
    <aside className="w-56 h-full bg-[#0B1220] border-r border-[#26314D] flex flex-col relative overflow-hidden">
      {/* Brand gradient top strip */}
      <div className="h-0.5 w-full brand-gradient-bg shrink-0" />

      {/* Logo area */}
      <div className="px-4 pt-4 pb-3 border-b border-[#26314D] shrink-0">
        <NavLink to="/" onClick={onClose} className="flex items-center gap-2 group mb-3">
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold tracking-tight text-white">ER</span>
            <span className="text-xl font-bold tracking-tight text-brand-gradient">VA</span>
          </div>
          <span className="text-[9px] text-[#8891A8] font-mono bg-[#1B2540] px-1.5 py-0.5 rounded">v1.0</span>
        </NavLink>

        {/* Hackathon badge */}
        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md brand-gradient-bg">
          <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse shrink-0" />
          <span className="text-[9px] font-bold text-white tracking-wide uppercase">QuantumHacks 2026</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150',
              isActive
                ? 'bg-gradient-to-r from-[#4FA0A0]/15 to-[#1F4747]/10 text-[#4FA0A0] border border-[#4FA0A0]/20'
                : 'text-[#8891A8] hover:bg-[#131B2E] hover:text-[#E8EAF0] border border-transparent'
            )}
          >
            {({ isActive }) => (
              <>
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-[#4FA0A0]' : '')} />
                <span className="font-medium">{label}</span>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#4FA0A0] shrink-0" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[#26314D] space-y-1">
        <NavLink
          to="/settings"
          onClick={onClose}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all border',
            isActive
              ? 'bg-gradient-to-r from-[#4FA0A0]/15 to-[#1F4747]/10 text-[#4FA0A0] border-[#4FA0A0]/20'
              : 'text-[#8891A8] hover:text-[#E8EAF0] hover:bg-[#131B2E] border-transparent'
          )}
        >
          <Cog6ToothIcon className="w-4 h-4" />
          <span>Settings</span>
        </NavLink>

      </div>
    </aside>
  )
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore()

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex shrink-0 h-screen">
        <SidebarContent />
      </div>

      {/* Mobile overlay */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={toggleSidebar}
            />
            <motion.div
              initial={{ x: -224 }}
              animate={{ x: 0 }}
              exit={{ x: -224 }}
              transition={{ type: 'tween', duration: 0.2 }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden"
            >
              <SidebarContent onClose={toggleSidebar} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
