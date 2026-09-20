import { useApp } from '../store'
import SuggestedConnection from './SuggestedConnection'

/** Desktop only. Three people worth meeting, from the same scored stack. */
export default function RightRail() {
  const { stack } = useApp()
  const top = stack.slice(0, 3)
  return (
    <aside className="hidden h-screen w-[290px] shrink-0 overflow-y-auto px-5 py-6 xl:block">
      {top.length > 0 && (
        <div className="rounded-card border border-line bg-surface px-4 py-3">
          <h2 className="text-[14px] font-semibold">People worth meeting</h2>
          <div className="divide-y divide-line">
            {top.map((r) => (
              <SuggestedConnection
                key={r.profile.id}
                variant="mini"
                s={{ profile: r.profile, reason: (r as { reason?: string }).reason ?? '', fit_label: r.fit_label }}
              />
            ))}
          </div>
        </div>
      )}
    </aside>
  )
}
