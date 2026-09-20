import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Button from '../components/Button'
import { useApp } from '../store'

export default function Landing() {
  const nav = useNavigate()
  const { restart } = useApp()
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)

  async function reset() {
    setResetting(true)
    try {
      await restart()
      setResetDone(true)
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-8 pt-20">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 flex -space-x-3">
            {['nova', 'koda', 'pixel', 'juno'].map((a) => (
              <Avatar key={a} name={a} size={44} ring />
            ))}
          </div>
          <h1 className="text-[44px] font-bold leading-[1.02] tracking-tight text-primary">
            LinkedUp
          </h1>
          <p className="mt-4 text-[24px] font-semibold leading-snug">
            Less LinkedIn.
            <br />
            More LinkedUp.
          </p>
          <p className="mt-5 max-w-[340px] text-[16px] leading-relaxed text-ink/85">
            LinkedIn tells you what people have done. Social media shows what people are doing.
            LinkedUp understands who you should be doing it with.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <p className="mb-5 text-[13px] font-medium text-muted">Match. Build. Ship.</p>
        <Button onClick={() => nav('/onboarding')}>
          Get started
          <ArrowRight size={20} strokeWidth={1.75} />
        </Button>
        <button
          type="button"
          onClick={reset}
          disabled={resetting}
          className="mx-auto mt-4 block text-[12px] text-muted/70 underline-offset-2 hover:underline"
        >
          {resetDone ? 'Demo reset' : resetting ? 'Resetting…' : 'Reset demo'}
        </button>
      </motion.div>
    </div>
  )
}
