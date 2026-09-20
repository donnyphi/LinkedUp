import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

const TYPES: [string, string][] = [
  ['update', 'Update'],
  ['build_log', 'Project'],
  ['looking_for', 'Looking for teammate'],
  ['question', 'Question'],
]

const HINT: Record<string, string> = {
  update: 'What happened today?',
  build_log: 'What did you build, and how badly does it work?',
  looking_for: 'Who do you need? Say the skill and the project.',
  question: 'Ask the people who might know.',
}

/**
 * The Create sheet. One type, one textarea, one button. After posting, the
 * backend has inferred what the post is about; Home refetches to show it.
 */
export default function CreateSheet({ open, onClose, onPosted }: { open: boolean; onClose: () => void; onPosted: () => void }) {
  const [type, setType] = useState('update')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 50)
  }, [open])

  async function submit() {
    if (!text.trim() || busy) return
    setBusy(true)
    setError('')
    try {
      await api.createPost(type, text.trim())
      setText('')
      setType('update')
      onPosted()
      onClose()
    } catch {
      setError("Couldn't post. Is the backend up?")
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 sm:items-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[560px] rounded-t-3xl bg-surface p-5 shadow-card sm:rounded-3xl"
            role="dialog"
            aria-label="Create a post"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px] font-semibold">Create</h2>
              <button type="button" onClick={onClose} aria-label="Close" className="text-muted">
                <X size={20} strokeWidth={1.75} />
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {TYPES.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setType(key)}
                  aria-pressed={type === key}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium ${
                    type === key ? 'bg-ink text-white' : 'bg-page text-muted'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={600}
              placeholder={HINT[type]}
              className="w-full resize-none rounded-2xl border border-line bg-page px-4 py-3 text-[16px] leading-relaxed"
            />
            {error && <p className="mt-2 text-[13px] text-primary-pressed">{error}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[12px] text-muted">{text.length}/600</span>
              <button
                type="button"
                onClick={submit}
                disabled={!text.trim() || busy}
                className="rounded-full bg-primary px-5 py-2.5 text-[15px] font-semibold text-white active:bg-primary-pressed disabled:opacity-50"
              >
                {busy ? 'Posting…' : 'Post'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
