import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { Heart, MessageSquare, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import { api } from '../api'
import { useApp } from '../store'
import type { StackEntry } from '../types'

const THRESHOLD = 110

function Why({
  id,
  open,
  setOpen,
}: {
  id: string
  open: boolean
  setOpen: (v: boolean) => void
}) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function toggle() {
    if (open) {
      setOpen(false)
      return
    }
    setOpen(true)
    if (text || loading) return
    setLoading(true)
    try {
      setText((await api.why(id)).explanation)
    } catch {
      setText('They fill the gaps you listed, and they want to build the same kind of thing.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        className="mb-2 flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-[12px] font-medium text-accent"
      >
        <Sparkles size={14} strokeWidth={1.75} />
        Why us?
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-2 overflow-hidden text-[13px] leading-snug text-muted"
          >
            {loading ? 'Thinking…' : text}
          </motion.p>
        )}
      </AnimatePresence>
    </>
  )
}

/**
 * One card. The drag motion values live in here on purpose: sharing them across
 * cards lets an exiting card's fade-out drive the incoming card's opacity too.
 */
function SwipeCard({ entry, onDecide }: { entry: StackEntry; onDecide: (d: 'left' | 'right') => void }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-14, 14])
  const passTint = useTransform(x, [-140, -30], [1, 0])
  const linkTint = useTransform(x, [30, 140], [0, 1])

  const [why, setWhy] = useState(false)
  const { profile } = entry
  const fills = new Set(entry.fills)

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > THRESHOLD) onDecide('right')
    else if (info.offset.x < -THRESHOLD) onDecide('left')
    else x.set(0)
  }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      style={{ x, rotate }}
      exit={{ opacity: 0, scale: 0.94, transition: { duration: 0.18 } }}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-3xl border border-[#EEE] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)] active:cursor-grabbing"
    >
      <motion.div
        style={{ opacity: passTint }}
        className="pointer-events-none absolute right-5 top-5 z-10 rounded-full border-2 border-muted px-3 py-1 text-[13px] font-semibold text-muted"
      >
        PASS
      </motion.div>
      <motion.div
        style={{ opacity: linkTint }}
        className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border-2 border-good px-3 py-1 text-[13px] font-semibold text-good"
      >
        LINK
      </motion.div>

      <div className="flex h-full flex-col overflow-hidden p-5">
        <div className="flex shrink-0 items-center gap-3">
          <Avatar name={profile.avatar} size={56} />
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold leading-tight">{profile.name}</h2>
            <p className="truncate text-[13px] text-muted">{profile.school}</p>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 shrink-0 text-[17px] font-medium leading-snug">
          {profile.builder_title}
        </p>

        <div className="mt-4 flex shrink-0 flex-wrap gap-1.5">
          {profile.skills.slice(0, 4).map((s) => (
            <span
              key={s.name}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                fills.has(s.name) ? 'bg-accent/10 text-accent' : 'bg-gray-100 text-ink'
              }`}
            >
              {s.name}
            </span>
          ))}
        </div>

        <div className="mt-4 shrink-0 rounded-2xl bg-gray-50 p-4">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Wants to build
          </p>
          <p className="mt-1.5 line-clamp-4 text-[14px] leading-snug">{profile.want_to_build}</p>
        </div>

        {!why && (
          <div className="mt-4 shrink-0">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Toxic trait as a teammate
            </p>
            <p className="mt-1 line-clamp-2 text-[14px] leading-snug">
              {profile.prompts.toxic_trait}
            </p>
          </div>
        )}

        <div className="mt-auto min-h-0 shrink-0 pt-4">
          <Why id={profile.id} open={why} setOpen={setWhy} />
          <div className="flex items-baseline gap-2 border-t border-[#F1F1F1] pt-3">
            <span className="text-[20px] font-semibold">{entry.score.overall}%</span>
            <span className="text-[13px] leading-snug text-muted">
              {entry.fills.length > 0
                ? `they have the ${entry.fills[0]} you're missing`
                : 'you want to build the same thing'}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function Swipe() {
  const nav = useNavigate()
  const { stack, cursor, advance, profile } = useApp()
  const [busy, setBusy] = useState(false)

  const entry = stack[cursor]
  const next = stack[cursor + 1]
  const left = stack.length - cursor

  async function decide(dir: 'left' | 'right') {
    if (!entry || busy) return
    setBusy(true)
    try {
      const res = await api.swipe(entry.profile.id, dir)
      if (dir === 'right' && res.match) {
        nav(`/match/${res.match.id}`)
        return
      }
      advance()
    } catch {
      advance()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full flex-col px-5 pb-5 pt-5">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">
            Link<span className="text-accent">Up</span>
          </h1>
          <p className="text-[13px] text-muted">
            {left > 0 ? `${left} people who could fill your gaps` : 'That is everybody for now'}
          </p>
        </div>
        <Avatar name={profile?.avatar ?? 'nova'} size={36} />
      </div>

      <div className="relative min-h-[440px] flex-1">
        {!entry && (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-[#EEE] bg-white px-6 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <p className="text-[17px] font-medium">You've seen everyone</p>
            <p className="mt-1 max-w-[240px] text-[14px] text-muted">
              Go build with the people you linked with. That was the point.
            </p>
            <button
              type="button"
              onClick={() => nav('/matches')}
              className="mt-5 rounded-full bg-accent px-5 py-2.5 text-[14px] font-semibold text-white"
            >
              See your matches
            </button>
          </div>
        )}

        {next && (
          <div className="pointer-events-none absolute inset-0 scale-[0.96] rounded-3xl border border-[#EEE] bg-white shadow-[0_8px_30px_rgba(0,0,0,0.06)]" />
        )}

        <AnimatePresence initial={false}>
          {entry && <SwipeCard key={entry.profile.id} entry={entry} onDecide={decide} />}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex shrink-0 items-center justify-center gap-5">
        <button
          type="button"
          onClick={() => decide('left')}
          disabled={busy || !entry}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-[#EEE] bg-white text-muted shadow-[0_8px_30px_rgba(0,0,0,0.06)] disabled:opacity-40"
        >
          <X size={24} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => nav('/matches')}
          aria-label="Your matches"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[#EEE] bg-white text-muted"
        >
          <MessageSquare size={18} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => decide('right')}
          disabled={busy || !entry}
          aria-label="Link"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-good text-white shadow-[0_8px_30px_rgba(34,197,94,0.3)] disabled:opacity-40"
        >
          <Heart size={24} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}
