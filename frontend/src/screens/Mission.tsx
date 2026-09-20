import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronDown, RotateCcw, Send } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import { SCOPE_LABEL } from '../constants'
import type { ChatMessage, ChatResponse, Match } from '../types'

const MIN_TYPING_MS = 700
const MAX_HOLD_MS = 1000

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function Step({ text, done, index, onToggle }: { text: string; done: boolean; index: number; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} className="flex w-full items-start gap-2.5 py-1.5 text-left" aria-pressed={done}>
      <motion.span
        animate={
          done
            ? { backgroundColor: '#16A34A', borderColor: '#16A34A', scale: [1, 1.15, 1] }
            : { backgroundColor: '#FFFFFF', borderColor: '#E8E8EC', scale: 1 }
        }
        transition={{ duration: 0.25 }}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2"
      >
        {done && <Check size={12} strokeWidth={3} color="#fff" />}
      </motion.span>
      <span className={`text-[13px] leading-snug ${done ? 'text-muted line-through' : ''}`}>
        <span className="mr-1.5 font-medium text-muted">{index + 1}</span>
        {text}
      </span>
    </button>
  )
}

function TypingBubble({ name }: { name: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.1 } }}
      className="flex justify-start"
      aria-live="polite"
      aria-label={`${name} is typing`}
    >
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md bg-surface px-4 py-3 shadow-card">
        <span className="mr-1 text-[12px] text-muted">{name} is typing</span>
        {[0, 1, 2].map((i) => (
          <span key={i} className="typing-dot h-1.5 w-1.5 rounded-full bg-muted" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </motion.div>
  )
}

function Bubble({ m }: { m: ChatMessage }) {
  if (m.from === 'system') {
    return (
      <div className="flex justify-center">
        <p className="max-w-[88%] rounded-xl border border-dashed border-line bg-page px-3 py-2 text-center text-[12px] leading-snug text-muted">
          {m.text}
        </p>
      </div>
    )
  }
  const mine = m.from === 'me'
  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <span
        className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[15px] leading-snug ${
          mine ? 'rounded-br-md bg-primary text-white' : 'rounded-bl-md bg-surface text-ink shadow-card'
        }`}
      >
        {m.text}
      </span>
    </div>
  )
}

export default function Mission() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const [match, setMatch] = useState<Match | null>(null)
  const [draft, setDraft] = useState('')
  const [typing, setTyping] = useState(false)
  const [failed, setFailed] = useState<string | null>(null)
  const [missionOpen, setMissionOpen] = useState(true)
  const chatEnd = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    api
      .match(id)
      .then((m) => {
        setMatch(m)
        // A refresh mid-failure: the message is saved, the reply is still owed.
        if (m.pending_reply) setFailed("Couldn't reach the model. Your message is saved.")
      })
      .catch(() => nav('/matches'))
  }, [id, nav])

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [match?.chat.length, typing, failed])

  async function toggle(step: number) {
    if (!match?.mission) return
    const optimistic: Match = {
      ...match,
      mission: { ...match.mission, done: match.mission.done.map((d, i) => (i === step ? !d : d)) },
    }
    setMatch(optimistic)
    try {
      setMatch(await api.toggleStep(id, step))
    } catch {
      setMatch(match)
    }
  }

  /** Runs one round trip with the typing bubble held for at least MIN_TYPING_MS. */
  async function roundTrip(run: () => Promise<ChatResponse>) {
    setFailed(null)
    setTyping(true)
    const started = Date.now()
    let res: ChatResponse | null = null
    let networkError = false
    try {
      res = await run()
    } catch {
      networkError = true
    }
    const hold = Math.min(Math.max(0, MIN_TYPING_MS - (Date.now() - started)), MAX_HOLD_MS)
    if (hold > 0) await sleep(hold)
    setTyping(false)

    if (networkError || !res) {
      setFailed("Couldn't reach the backend. Your message is saved.")
      try {
        setMatch(await api.match(id)) // the message is on the server even if the reply is not
      } catch {
        /* keep what we have */
      }
      return
    }
    setMatch(res.match)
    if (res.status === 'error') setFailed(res.error ?? "Couldn't reach the model. Your message is saved.")
  }

  async function send() {
    const text = draft.trim()
    if (!text || typing || !match) return
    setDraft('')
    // Show the user's words immediately; the server copy replaces this on return.
    setMatch({ ...match, chat: [...match.chat, { from: 'me', text, ts: Date.now() / 1000 }] })
    await roundTrip(() => api.sendChat(id, text))
    inputRef.current?.focus()
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  if (!match) return <Loading label="Opening your build…" />

  const first = match.other.name.split(' ')[0]
  const idea = match.chosen_idea !== null ? match.ideas[match.chosen_idea] : null
  const done = match.mission?.done.filter(Boolean).length ?? 0
  const total = match.mission?.steps.length ?? 0
  const allDone = total > 0 && done === total

  return (
    <div className="flex h-full flex-col">
      <header className="shrink-0 border-b border-line bg-surface px-4 py-3">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => nav('/matches')} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
          <Avatar name={match.other.avatar} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-semibold leading-tight">{idea ? idea.name : match.other.name}</p>
            <p className="truncate text-[12px] text-muted">
              with {first}
              {idea ? ` · ${SCOPE_LABEL[idea.difficulty] ?? idea.difficulty}` : ''}
            </p>
          </div>
        </div>
      </header>

      {match.mission && (
        <div className="shrink-0 border-b border-line bg-surface px-4">
          <button
            type="button"
            onClick={() => setMissionOpen(!missionOpen)}
            className="flex w-full items-center justify-between py-3 text-left"
            aria-expanded={missionOpen}
          >
            <p className="text-[14px] font-semibold">
              First 30 minutes
              <span className={`ml-2 font-medium ${allDone ? 'text-good' : 'text-muted'}`}>
                · {done}/{total} complete
              </span>
            </p>
            <ChevronDown size={18} strokeWidth={1.75} className={`text-muted transition-transform ${missionOpen ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence initial={false}>
            {missionOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="pb-2">
                  {match.mission.steps.map((s, i) => (
                    <Step key={i} index={i} text={s} done={match.mission!.done[i]} onToggle={() => toggle(i)} />
                  ))}
                  {allDone && (
                    <p className="mb-2 mt-1 rounded-xl bg-good-soft px-3 py-2 text-[13px] font-medium text-good">
                      You two just built something together. That was the whole point.
                    </p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-2.5">
          {match.chat.length === 0 && !typing && (
            <p className="rounded-2xl bg-surface px-4 py-3 text-center text-[13px] text-muted shadow-card">
              Say hi. {first} is a real conversation, not a script.
            </p>
          )}
          {match.chat.map((m, i) => (
            <motion.div key={`${i}-${m.ts}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Bubble m={m} />
            </motion.div>
          ))}
          {failed && !typing && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => roundTrip(() => api.retryChat(id))}
                className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[12px] font-medium text-primary"
              >
                <RotateCcw size={13} strokeWidth={2} />
                {failed} Retry
              </button>
            </div>
          )}
          <AnimatePresence>{typing && <TypingBubble name={first} />}</AnimatePresence>
          <div ref={chatEnd} />
        </div>
      </div>

      <form
        className="flex shrink-0 items-end gap-2 border-t border-line bg-surface px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault()
          void send()
        }}
      >
        <textarea
          ref={inputRef}
          value={draft}
          rows={1}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          disabled={typing}
          placeholder={`Message ${first}`}
          className="max-h-32 min-h-[46px] flex-1 resize-none rounded-2xl border border-line bg-page px-4 py-3 text-[15px] leading-snug disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!draft.trim() || typing}
          aria-label="Send"
          className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl bg-primary text-white active:bg-primary-pressed disabled:opacity-40"
        >
          <Send size={18} strokeWidth={1.75} />
        </button>
      </form>
    </div>
  )
}
