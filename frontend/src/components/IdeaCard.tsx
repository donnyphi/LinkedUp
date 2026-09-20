import { Check } from 'lucide-react'
import { SCOPE_LABEL } from '../constants'
import type { Idea } from '../types'

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
  const first = otherName.split(' ')[0]
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!onSelect}
      aria-pressed={selected}
      className={`w-full rounded-card border bg-surface p-4 text-left transition-colors ${
        selected ? 'border-primary bg-primary-soft/40' : 'border-line shadow-card'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h4 className="text-[17px] font-semibold leading-tight">{idea.name}</h4>
        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
            selected ? 'bg-primary text-white' : 'bg-page text-muted'
          }`}
        >
          {SCOPE_LABEL[idea.difficulty] ?? idea.difficulty}
        </span>
      </div>
      <p className="mt-1 text-[14px] leading-snug text-muted">{idea.one_liner}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[12px] leading-snug">
        <div className="rounded-xl bg-page px-3 py-2">
          <p className="mb-0.5 font-medium text-muted">You</p>
          <p>{idea.roles.me}</p>
        </div>
        <div className="rounded-xl bg-page px-3 py-2">
          <p className="mb-0.5 font-medium text-muted">{first}</p>
          <p>{idea.roles.them}</p>
        </div>
      </div>
      {selected && (
        <p className="mt-3 flex items-center gap-1.5 text-[12px] font-medium text-primary">
          <Check size={14} strokeWidth={2.5} /> Picked
        </p>
      )}
    </button>
  )
}
