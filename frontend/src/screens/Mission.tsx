import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import type { Match } from '../types'

const DIFFICULTY: Record<string, string> = {
  weekend: 'a weekend',
  month: 'a month',
  startup: 'a real thing',
}

function Step({
  text,
  done,
  index,
  onToggle,
}: {
  text: string
  done: boolean
  index: number
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-start gap-3 rounded-2xl px-1 py-2.5 text-left"
    >
      <motion.span
        animate={
          done
            ? { backgroundColor: '#22C55E', borderColor: '#22C55E', scale: [1, 1.18, 1] }
            : { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', scale: 1 }
        }
        transition={{ duration: 0.28 }}
        className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2"
      >
        <AnimatePresence>
          {done && (
            <motion.span
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
            >
              <Check size={14} strokeWidth={3} color="#fff" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.span>
      <span className="flex-1">
        <span className="mr-2 text-[12px] font-medium text-muted">{index + 1}</span>
        <motion.span
          animate={{ opacity: done ? 0.45 : 1 }}
          className={`text-[15px] leading-snug ${done ? 'line-through' : ''}`}
        >
          {text}
        </motion.span>
      </span>
    </button>
  )
}

export default function Mission() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const chatEnd = useRef<HTMLDivElement>(null)

  useEffect(() => {
    api.match(id).then(setMatch).catch(() => nav('/matches'))
  }, [id, nav])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [match?.chat.length])

  async function toggle(step: number) {
    if (!match) return
    const optimistic = { ...match, mission: match.mission && { ...match.mission } }
    if (optimistic.mission) {
      optimistic.mission.done = optimistic.mission.done.map((d, i) => (i === step ? !d : d))
      setMatch(optimistic)
    }
    try {
      setMatch(await api.toggleStep(id, step))
    } catch {
      setMatch(match)
    }
  }

  async function send() {
    const text = draft.trim()
    if (!text || sending || !match) return
    setSending(true)
    setDraft('')
    try {
      setMatch(await api.sendChat(id, text))
    } catch {
      setDraft(text)
    } finally {
      setSending(false)
    }
  }

  if (!match) return <Loading label="Opening your build…" />

  const idea = match.chosen_idea !== null ? match.ideas[match.chosen_idea] : null
  const done = match.mission?.done.filter(Boolean).length ?? 0
  const total = match.mission?.steps.length ?? 0
  const allDone = total > 0 && done === total

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-10 border-b border-[#EEE] bg-page/95 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => nav('/matches')}
            aria-label="Back"
            className="text-muted"
          >
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <Avatar name={match.other.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">
              {idea ? idea.name : match.other.name}
            </p>
            <p className="truncate text-[12px] text-muted">
              with {match.other.name.split(' ')[0]}
              {idea ? ` · ${DIFFICULTY[idea.difficulty] ?? idea.difficulty}` : ''}
            </p>
          </div>
        </div>
      </header>

      <div className="px-5 pt-5">
        {idea && <p className="mb-5 text-[15px] leading-snug text-muted">{idea.one_liner}</p>}

        <div className="rounded-3xl border border-[#EEE] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
          <div className="mb-1 flex items-baseline justify-between">
            <h2 className="text-[16px] font-semibold">First 30 minutes</h2>
            <span className={`text-[13px] font-medium ${allDone ? 'text-good' : 'text-muted'}`}>
              {done}/{total}
            </span>
          </div>
          <p className="mb-3 text-[13px] text-muted">Do these together, right now.</p>
          {match.mission?.steps.map((s, i) => (
            <Step key={i} index={i} text={s} done={match.mission!.done[i]} onToggle={() => toggle(i)} />
          ))}
          <AnimatePresence>
            {allDone && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-3 overflow-hidden rounded-2xl bg-good/10 px-4 py-3 text-[14px] font-medium text-good"
              >
                You two just built something together. That was the whole point.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-6 flex flex-1 flex-col px-5 pb-5">
        <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-muted">Chat</h2>
        <div className="flex-1 space-y-2">
          {match.chat.length === 0 && (
            <p className="rounded-2xl bg-gray-50 px-4 py-3 text-[14px] text-muted">
              Say the first thing. Step one is easier out loud.
            </p>
          )}
          {match.chat.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${m.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <span
                className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-[14px] leading-snug ${
                  m.from === 'me'
                    ? 'rounded-br-md bg-accent text-white'
                    : 'rounded-bl-md bg-white text-ink shadow-[0_2px_10px_rgba(0,0,0,0.05)]'
                }`}
              >
                {m.text}
              </span>
            </motion.div>
          ))}
          <div ref={chatEnd} />
        </div>

        <form
          className="mt-4 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void send()
          }}
        >
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${match.other.name.split(' ')[0]}`}
            className="flex-1 rounded-2xl border border-[#EEE] bg-white px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Send"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-white disabled:opacity-40"
          >
            <Send size={18} strokeWidth={1.75} />
          </button>
        </form>
      </div>
    </div>
  )
}
