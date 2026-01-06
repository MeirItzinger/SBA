import { Link, useLocation } from 'react-router-dom'
import { FileText, BarChart3 } from 'lucide-react'
import { cn } from '../lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col">
        {/* Logo */}
        <div className="h-16 px-6 flex items-center border-b border-[var(--border-color)]">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-[var(--text-primary)] leading-tight">SBA Portal</h1>
              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Underwriting AI</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          <NavItem
            to="/"
            icon={<BarChart3 className="w-5 h-5" />}
            label="Deals Dashboard"
            active={location.pathname === '/'}
          />
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-[var(--border-color)]">
          <div className="px-3 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border-color)]">
            <p className="text-xs text-[var(--text-muted)]">Version 1.0.0</p>
            <p className="text-xs text-[var(--text-muted)]">Single-user mode</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-full">
          {children}
        </div>
      </main>
    </div>
  )
}

interface NavItemProps {
  to: string
  icon: React.ReactNode
  label: string
  active?: boolean
}

function NavItem({ to, icon, label, active }: NavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all',
        active
          ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}

