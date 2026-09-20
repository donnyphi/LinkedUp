import { Compass, Home, MessageSquare, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

export const NAV_ITEMS = [
  { to: '/home', label: 'Home', Icon: Home },
  { to: '/discover', label: 'Discover', Icon: Compass },
  { to: '/messages', label: 'Messages', Icon: MessageSquare },
  { to: '/profile', label: 'Profile', Icon: User },
]

export default function BottomNav() {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-line bg-surface lg:hidden">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted'
            }`
          }
        >
          <Icon size={22} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
