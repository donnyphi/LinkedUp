import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'

export default function Landing() {
  const nav = useNavigate()
  return (
    <div className="flex min-h-full flex-col justify-between px-6 pb-10 pt-20">
      <div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="mb-8 flex -space-x-3">
            {['nova', 'juno', 'pixel', 'ember'].map((a) => (
              <Avatar key={a} name={a} size={44} ring />
            ))}
          </div>
          <h1 className="text-[44px] font-semibold leading-[1.05] tracking-tight">
            Link<span className="text-accent">Up</span>
          </h1>
          <p className="mt-4 text-[22px] font-medium leading-snug">
            Less LinkedIn.
            <br />
            More LinkUp.
          </p>
          <p className="mt-5 max-w-[300px] text-[15px] leading-relaxed text-muted">
            Find the person who has the thing you're missing, and start building with them in the
            next thirty minutes.
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
      >
        <div className="mb-6 flex gap-2 text-[13px] font-medium text-muted">
          <span>Match.</span>
          <span>Build.</span>
          <span>Ship.</span>
        </div>
        <button
          type="button"
          onClick={() => nav('/onboarding')}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[16px] font-semibold text-white"
        >
          Get started
          <ArrowRight size={20} strokeWidth={1.75} />
        </button>
      </motion.div>
    </div>
  )
}
