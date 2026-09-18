import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const navGroups = [
  {
    label: 'COMMAND CENTER',
    items: [
      { path: '/dashboard', icon: 'terminal', label: 'Dashboard' },
    ],
  },
  {
    label: 'ENGINEERING',
    items: [
      { path: '/repositories', icon: 'folder_copy', label: 'Repositories' },
      { path: '/topology', icon: 'hub', label: 'Topology' },
      { path: '/incidents', icon: 'warning', label: 'Incidents' },
      { path: '/agent-runs', icon: 'smart_toy', label: 'Agent Runs' },
      { path: '/pull-requests', icon: 'commit', label: 'Pull Requests' },
    ],
  },
  {
    label: 'SECURITY',
    items: [
      { path: '/security', icon: 'shield', label: 'Security Center' },
      { path: '/vulnerabilities', icon: 'gavel', label: 'Vulnerabilities' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { path: '/activity', icon: 'reorder', label: 'Activity Log' },
      { path: '/analytics', icon: 'equalizer', label: 'Analytics' },
      { path: '/settings', icon: 'settings', label: 'Settings' },
    ],
  },
]

export default function Sidebar() {
  const location = useLocation()

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[220px] bg-surface-container-low border-r border-surface-container-highest/50 flex flex-col z-40">
      {/* Brand */}
      <div className="h-[52px] px-4 flex items-center gap-2.5 border-b border-surface-container-highest/30">
        <div className="w-7 h-7 rounded-lg bg-surface-container-high flex items-center justify-center shadow-[0_0_8px_rgba(208,188,255,0.25)]">
          <span className="material-symbols-outlined text-[16px] text-primary">shield_with_heart</span>
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-headline-sm text-[14px] text-on-surface tracking-tight uppercase font-semibold">RepoGuard</span>
            <span className="flex items-center gap-1 text-code-sm text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse-dot" />
              LIVE
            </span>
          </div>
          <span className="text-label-sm text-outline tracking-wider">V2.4 AUTONOMOUS</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 no-scrollbar">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <div className="px-2 mb-1.5 text-label-sm text-outline tracking-wider uppercase">{group.label}</div>
            <div className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = location.pathname === item.path || (item.path === '/incidents' && location.pathname.startsWith('/incidents/'))
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={`relative flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg text-body-md transition-colors ${
                      isActive
                        ? 'bg-surface-container-high text-primary'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface'
                    }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="sidebar-active"
                        className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                    <span className="text-[13px]">{item.label}</span>
                    {item.label === 'Incidents' && (
                      <span className="ml-auto w-4 h-4 rounded-full bg-error/20 text-error text-[10px] font-mono font-bold flex items-center justify-center">3</span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Status */}
      <div className="px-3 py-3 border-t border-surface-container-highest/30 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_6px_#67df70]" />
          <span className="text-code-sm text-on-surface font-medium">Agent Online</span>
        </div>
        <div className="flex flex-col gap-1 text-label-sm text-outline">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span>GitHub Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span>Nebius Connected</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-tertiary" />
            <span>Supabase Connected</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
