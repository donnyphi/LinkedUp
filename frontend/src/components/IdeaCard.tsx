import { Check } from 'lucide-react'
import type { Idea } from '../types'

const BADGE: Record<string, string> = {
  weekend: 'bg-good/10 text-good',
  month: 'bg-accent/10 text-accent',
  startup: 'bg-gray-100 text-muted',
}

const BADGE_LABEL: Record<string, string> = {
  weekend: 'a weekend',
  month: 'a month',
  startup: 'a real thing',
}

export default function IdeaCard({
  idea,
  selected,
  onSelect,
  otherName,
}: {
  idea: Idea
  selected: boolean
  onSelect?: () => void
  otherName: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      className={`w-full rounded-3xl border bg-white p-4 text-left transition-all ${
        selected
          ? 'border-accent shadow-[0_8px_30px_rgba(91,91,246,0.16)]'
          : 'border-[#EEE] shadow-[0_8px_30px_rgba(0,0,0,0.06)]'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-[16px] font-semibold">{idea.name}</h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            BADGE[idea.difficulty] ?? BADGE.month
          }`}
        >
          {BADGE_LABEL[idea.difficulty] ?? idea.difficulty}
        </span>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-muted">{idea.one_liner}</p>
      <div className="mt-3 space-y-1 border-t border-[#F1F1F1] pt-3 text-[12px]">
        <p>
          <span className="text-muted">you · </span>
          {idea.roles.me}
        </p>
        <p>
          <span className="text-muted">{otherName.split(' ')[0].toLowerCase()} · </span>
          {idea.roles.them}
        </p>
      </div>
      {selected && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-accent">
          <Check size={14} strokeWidth={2.5} /> picked
        </p>
      )}
    </button>
  )
}
