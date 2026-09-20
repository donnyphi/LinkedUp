import type { SkillBar } from '../types'

const WIDTH = ['6%', '34%', '66%', '100%']

/**
 * Paired bars per skill. Whoever fills the other's gap gets the pink bar, so the
 * complement reads at a glance without reading any of the labels.
 */
export default function SkillBars({
  bars,
  otherName,
  max = 4,
}: {
  bars: SkillBar[]
  otherName: string
  max?: number
}) {
  const first = otherName.split(' ')[0]
  return (
    <div className="space-y-4">
      {bars.slice(0, max).map((bar) => {
        const theyLead = bar.fills_my_gap
        const youLead = bar.fills_their_gap
        return (
          <div key={bar.name}>
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[14px] font-medium">{bar.name}</span>
              <span className="text-[12px] text-muted">
                {theyLead ? `${first} brings this` : youLead ? 'You bring this' : ''}
              </span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 text-[11px] text-muted">You</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-page">
                  <div
                    className={`h-full rounded-full ${youLead ? 'bg-primary' : 'bg-ink/25'}`}
                    style={{ width: WIDTH[bar.mine] }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-12 shrink-0 truncate text-[11px] text-muted">{first}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-page">
                  <div
                    className={`h-full rounded-full ${theyLead ? 'bg-primary' : 'bg-ink/25'}`}
                    style={{ width: WIDTH[bar.theirs] }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
