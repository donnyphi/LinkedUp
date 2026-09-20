import { AnimatePresence, motion, useMotionValue, useTransform } from 'framer-motion'
import type { PanInfo } from 'framer-motion'
import { Heart, Info, X } from 'lucide-react'
import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Card from '../components/Card'
import { api } from '../api'
import { useApp } from '../store'
import type { StackEntry } from '../types'

const THRESHOLD = 110

function joinSkills(list: string[]) {
  const two = list.slice(0, 2)
  return two.length === 2 ? `${two[0]} and ${two[1]}` : two[0]
}

/** The "why this person" block. Visible without a tap; the number stays secondary. */
function WhyThisPerson({ entry, expanded, text, loading }: { entry: StackEntry; expanded: boolean; text: string; loading: boolean }) {
  const they = entry.fills.length ? `They bring ${joinSkills(entry.fills)}.` : ''
  const you = entry.you_bring.length ? `You bring ${joinSkills(entry.you_bring)}.` : ''
  const line = [they, you].filter(Boolean).join(' ') || 'You want to build the same kind of thing.'
  return (
    <div className="rounded-2xl bg-primary-soft px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-primary">{entry.fit_label}</span>
        <span className="text-[12px] text-muted">
          Builder fit <span className="font-semibold text-ink">{entry.score.overall}</span>
        </span>
      </div>
      <p className="mt-1 text-[14px] leading-snug">{line}</p>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden text-[13px] leading-snug text-muted"
          >
            <span className="block pt-2">{loading ? 'Thinking…' : text}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * One card. The drag motion values live in here on purpose: sharing them across
 * cards lets an exiting card's fade-out drive the incoming card's opacity too.
 */
function SwipeCard({
  entry,
  leaving,
  onDecide,
}: {
  entry: StackEntry
  leaving: 'left' | 'right' | null
  onDecide: (d: 'left' | 'right') => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-220, 220], [-12, 12])
  const passTint = useTransform(x, [-140, -30], [1, 0])
  const linkTint = useTransform(x, [30, 140], [0, 1])
  const [why, setWhy] = useState(false)
  const [whyText, setWhyText] = useState('')
  const [whyLoading, setWhyLoading] = useState(false)

  const { profile } = entry
  const fills = new Set(entry.fills)

  function onDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > THRESHOLD) onDecide('right')
    else if (info.offset.x < -THRESHOLD) onDecide('left')
    else x.set(0)
  }

  async function toggleWhy() {
    if (why) return setWhy(false)
    setWhy(true)
    if (whyText || whyLoading) return
    setWhyLoading(true)
    try {
      setWhyText((await api.why(profile.id)).explanation)
    } catch {
      setWhyText('They fill the gaps you listed, and they want to build the same kind of thing.')
    } finally {
      setWhyLoading(false)
    }
  }

  const exit =
    leaving === 'right'
      ? { x: 480, rotate: 14, opacity: 0, transition: { duration: 0.28 } }
      : leaving === 'left'
        ? { x: -480, rotate: -14, opacity: 0, transition: { duration: 0.28 } }
        : { opacity: 0, scale: 0.96, transition: { duration: 0.18 } }

  return (
    <motion.div
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={onDragEnd}
      style={{ x, rotate }}
      exit={exit}
      className="absolute inset-0 cursor-grab overflow-hidden rounded-card border border-line bg-surface shadow-card active:cursor-grabbing"
    >
      <motion.div
        style={{ opacity: passTint }}
        className="pointer-events-none absolute right-5 top-5 z-10 rounded-full border-2 border-muted px-3 py-1 text-[13px] font-semibold text-muted"
      >
        Pass
      </motion.div>
      <motion.div
        style={{ opacity: linkTint }}
        className="pointer-events-none absolute left-5 top-5 z-10 rounded-full border-2 border-primary px-3 py-1 text-[13px] font-semibold text-primary"
      >
        Connect
      </motion.div>

      <div className="flex h-full flex-col overflow-hidden p-5">
        <div className="flex shrink-0 items-center gap-3">
          <Avatar name={profile.avatar} size={56} />
          <div className="min-w-0">
            <h2 className="truncate text-[20px] font-semibold leading-tight">{profile.name}</h2>
            <p className="truncate text-[13px] text-muted">{profile.school}</p>
          </div>
        </div>

        <p className="mt-3 line-clamp-2 shrink-0 text-[16px] font-medium leading-snug">{profile.builder_title}</p>

        <div className="mt-3 flex shrink-0 flex-wrap gap-1.5">
          {profile.skills.slice(0, 3).map((s) => (
            <span
              key={s.name}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                fills.has(s.name) ? 'bg-primary-soft text-primary' : 'bg-page text-ink'
              }`}
            >
              {s.name}
            </span>
          ))}
        </div>

        <div className="mt-3 shrink-0">
          <p className="text-[12px] font-medium text-muted">Wants to build</p>
          <p className="mt-0.5 line-clamp-3 text-[14px] leading-snug">{profile.want_to_build}</p>
        </div>

        {!why && (
          <div className="mt-3 shrink-0">
            <p className="text-[12px] font-medium text-muted">Toxic trait as a teammate</p>
            <p className="mt-0.5 line-clamp-2 text-[14px] leading-snug">{profile.prompts.toxic_trait}</p>
          </div>
        )}

        <div className="mt-auto shrink-0 pt-3">
          <WhyThisPerson entry={entry} expanded={why} text={whyText} loading={whyLoading} />
          <button
            type="button"
            onClick={toggleWhy}
            className="mt-2 flex items-center gap-1 text-[12px] font-medium text-muted"
          >
            <Info size={14} strokeWidth={1.75} />
            {why ? 'Less' : 'Why us?'}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default function Swipe() {
  const nav = useNavigate()
  const { stack, cursor, advance, restart } = useApp()
  const [busy, setBusy] = useState(false)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const pressTimer = useRef<number | null>(null)

  const entry = stack[cursor]
  const next = stack[cursor + 1]

  async function decide(dir: 'left' | 'right') {
    if (!entry || busy) return
    setBusy(true)
    setLeaving(dir)
    try {
      const [res] = await Promise.all([
        api.swipe(entry.profile.id, dir),
        new Promise((r) => setTimeout(r, 250)), // let the card leave before anything else moves
      ])
      if (dir === 'right' && res.match) {
        nav(`/match/${res.match.id}`)
        return
      }
    } catch {
      /* a failed pass is still a pass */
    } finally {
      setBusy(false)
      setLeaving(null)
    }
    advance()
  }

  // Long-press the wordmark to reset the demo between judges. Unobtrusive on purpose.
  function pressStart() {
    pressTimer.current = window.setTimeout(async () => {
      await restart()
      nav('/')
    }, 900)
  }
  function pressEnd() {
    if (pressTimer.current) window.clearTimeout(pressTimer.current)
  }

  return (
    <div className="flex h-full flex-col px-5 pb-4 pt-5">
      <div className="mb-3 flex shrink-0 items-center justify-between">
        <div
          onPointerDown={pressStart}
          onPointerUp={pressEnd}
          onPointerLeave={pressEnd}
          className="select-none"
          title="Hold to reset the demo"
        >
          <h1 className="text-[20px] font-semibold tracking-tight">Quick discover</h1>
          <p className="text-[13px] text-muted">
            {entry ? 'One at a time. Swipe or tap.' : 'That is everybody for now'}
          </p>
        </div>
        <button type="button" onClick={() => nav('/discover')} className="text-[13px] font-medium text-muted">
          Back to Discover
        </button>
      </div>

      <div className="relative min-h-[460px] flex-1">
        {!entry && (
          <Card className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="text-[17px] font-semibold">You've seen everyone</p>
            <p className="mt-1 max-w-[240px] text-[14px] text-muted">
              Go build with the people you connected with. That was the point.
            </p>
            <button
              type="button"
              onClick={() => nav('/messages')}
              className="mt-5 rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-white"
            >
              See your matches
            </button>
          </Card>
        )}

        {next && (
          <div className="pointer-events-none absolute inset-0 scale-[0.96] rounded-card border border-line bg-surface shadow-card" />
        )}

        <AnimatePresence initial={false}>
          {entry && <SwipeCard key={entry.profile.id} entry={entry} leaving={leaving} onDecide={decide} />}
        </AnimatePresence>
      </div>

      <div className="mt-4 flex shrink-0 items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => decide('left')}
          disabled={busy || !entry}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card disabled:opacity-40"
        >
          <X size={24} strokeWidth={1.75} />
        </button>
        <button
          type="button"
          onClick={() => decide('right')}
          disabled={busy || !entry}
          aria-label="Connect"
          className="flex h-[60px] flex-1 items-center justify-center gap-2 rounded-full bg-primary text-[16px] font-semibold text-white shadow-[0_8px_24px_rgba(255,10,84,0.28)] active:bg-primary-pressed disabled:opacity-40"
        >
          <Heart size={22} strokeWidth={1.75} />
          Connect
        </button>
      </div>
    </div>
  )
}
