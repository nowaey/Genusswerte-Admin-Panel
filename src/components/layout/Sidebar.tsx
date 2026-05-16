import { NavLink } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ShoppingBag,
  Ticket,
  CalendarCheck,
  Users,
  CalendarDays,
  UsersRound,
  LogOut,
} from 'lucide-react'

const nav = [
  { to: '/',               label: 'Dashboard',       icon: LayoutDashboard },
  { to: '/orders',         label: 'Bestellungen',    icon: ShoppingBag },
  { to: '/vouchers',       label: 'Gutscheine',      icon: Ticket },
  { to: '/redemptions',    label: 'Einlösungen',     icon: CalendarCheck },
  { to: '/tastings',       label: 'Termine',         icon: CalendarDays },
  { to: '/group-requests', label: 'Gruppenanfragen', icon: UsersRound },
  { to: '/customers',      label: 'Kunden',          icon: Users },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-border flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="font-semibold text-sm text-foreground">Genusswerte</span>
        <span className="block text-xs text-muted-foreground">Admin Panel</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground font-medium'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + Logout */}
      <div className="px-3 py-4 border-t border-border">
        <p className="text-xs text-muted-foreground px-3 mb-2 truncate">{user?.email}</p>
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Abmelden
        </button>
      </div>
    </aside>
  )
}
