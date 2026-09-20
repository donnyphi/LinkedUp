import { NavLink, useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import { useApp } from '../store'
import { NAV_ITEMS } from './BottomNav'

/** Desktop only. The wordmark, four tabs, and you. */
export default function Sidebar() {
  const { profile } = useApp()
  const nav = useNavigate()
  return (
    <aside className="hidden h-screen w-[230px] shrink-0 flex-col px-5 py-6 lg:flex">
      <button type="button" onClick={() => nav('/home')} className="mb-8 text-left text-[26px] font-bold tracking-tight text-primary">
        LinkedUp
      </button>
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-3 py-2.5 text-[16px] transition-colors ${
                isActive ? 'bg-surface font-semibold text-ink shadow-card' : 'text-muted hover:text-ink'
              }`
            }
          >
            <Icon size={22} strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto">
        {profile && (
          <button type="button" onClick={() => nav('/profile')} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left">
            <Avatar name={profile.avatar} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{profile.name}</p>
              <p className="truncate text-[12px] text-muted">{profile.school}</p>
            </div>
          </button>
        )}
      </div>
    </aside>
  )
}
