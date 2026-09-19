import { Layers, MessageSquare, User } from 'lucide-react'
import { NavLink } from 'react-router-dom'

const ITEMS = [
  { to: '/swipe', label: 'Swipe', Icon: Layers },
  { to: '/matches', label: 'Matches', Icon: MessageSquare },
  { to: '/me', label: 'Profile', Icon: User },
]

export default function BottomNav() {
  return (
    <nav className="flex shrink-0 items-stretch border-t border-[#EEE] bg-white/95 backdrop-blur">
      {ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 py-3 text-[11px] font-medium transition-colors ${
              isActive ? 'text-accent' : 'text-muted'
            }`
          }
        >
          <Icon size={20} strokeWidth={1.75} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
