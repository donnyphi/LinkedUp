import type { SkillBar } from '../types'

const WIDTH = ['0%', '33%', '66%', '100%']

function Row({ bar, otherName }: { bar: SkillBar; otherName: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-[13px] font-medium">{bar.name}</span>
        {bar.fills_my_gap && (
          <span className="text-[11px] font-medium text-accent">fills your gap</span>
        )}
        {!bar.fills_my_gap && bar.fills_their_gap && (
          <span className="text-[11px] font-medium text-muted">you fill theirs</span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 text-[10px] text-muted">you</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-ink/70" style={{ width: WIDTH[bar.mine] }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 shrink-0 truncate text-[10px] text-muted">{otherName}</span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full ${bar.fills_my_gap ? 'bg-accent' : 'bg-ink/30'}`}
              style={{ width: WIDTH[bar.theirs] }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SkillBars({ bars, otherName }: { bars: SkillBar[]; otherName: string }) {
  const first = otherName.split(' ')[0].toLowerCase()
  return (
    <div className="space-y-4">
      {bars.map((b) => (
        <Row key={b.name} bar={b} otherName={first} />
      ))}
    </div>
  )
}
