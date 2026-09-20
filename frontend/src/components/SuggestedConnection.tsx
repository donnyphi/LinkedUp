import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import { api } from '../api'
import type { Profile } from '../types'

export interface SuggestionLike {
  profile: Profile
  reason: string
  fit_label?: string
  connected?: boolean
}

/**
 * The one visually distinct element in the feed: "You two should know each other."
 * Everything it says comes from real profile and post fields.
 */
export default function SuggestedConnection({
  s,
  variant = 'card',
  label = 'You two should know each other',
}: {
  s: SuggestionLike
  variant?: 'card' | 'mini'
  label?: string
}) {
  const nav = useNavigate()
  const [busy, setBusy] = useState(false)
  const { profile } = s

  async function connect() {
    if (busy) return
    setBusy(true)
    try {
      const { match } = await api.connect(profile.id)
      nav(`/match/${match.id}`)
    } catch {
      setBusy(false)
    }
  }

  if (variant === 'mini') {
    return (
      <div className="flex gap-3 py-3">
        <button type="button" onClick={() => nav(`/people/${profile.id}`)} aria-label={profile.name}>
          <Avatar name={profile.avatar} size={40} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => nav(`/people/${profile.id}`)} className="text-left">
            <p className="text-[14px] font-semibold leading-tight">{profile.name}</p>
            <p className="truncate text-[12px] text-muted">{profile.builder_title}</p>
          </button>
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-ink/80">{s.reason}</p>
          <button
            type="button"
            onClick={s.connected ? () => nav(`/people/${profile.id}`) : connect}
            disabled={busy}
            className="mt-1.5 text-[13px] font-semibold text-primary disabled:opacity-50"
          >
            {s.connected ? 'Connected' : busy ? 'Connecting…' : 'Connect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <section className="border-b border-line bg-primary-soft/60 px-5 py-4">
      <p className="mb-3 text-[12px] font-semibold text-primary">{label}</p>
      <div className="flex gap-3">
        <button type="button" onClick={() => nav(`/people/${profile.id}`)} aria-label={profile.name}>
          <Avatar name={profile.avatar} size={52} />
        </button>
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => nav(`/people/${profile.id}`)} className="text-left">
            <p className="text-[16px] font-semibold leading-tight">{profile.name}</p>
            <p className="text-[13px] text-muted">
              {profile.builder_title} · {profile.school}
            </p>
          </button>
          <p className="mt-2 text-[15px] leading-relaxed">{s.reason}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => nav(`/people/${profile.id}`)}
              className="rounded-full border border-line bg-surface px-4 py-2 text-[14px] font-semibold"
            >
              View profile
            </button>
            <button
              type="button"
              onClick={s.connected ? () => nav(`/people/${profile.id}`) : connect}
              disabled={busy}
              className="rounded-full bg-primary px-4 py-2 text-[14px] font-semibold text-white active:bg-primary-pressed disabled:opacity-60"
            >
              {s.connected ? 'Connected' : busy ? 'Connecting…' : 'Connect'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
