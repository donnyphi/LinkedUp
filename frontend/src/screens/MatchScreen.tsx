import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import IdeaCard from '../components/IdeaCard'
import Loading from '../components/Loading'
import SkillBars from '../components/SkillBars'
import { api } from '../api'
import { useApp } from '../store'
import type { Match } from '../types'

const REVEAL_MS = 1100

/** The match moment. Owns the whole frame for just over a second; a tap skips it. */
function Reveal({ mine, theirs, name, onDone }: { mine: string; theirs: string; name: string; onDone: () => void }) {
  return (
    <motion.button
      type="button"
      onClick={onDone}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="flex h-full min-h-[560px] w-full flex-col items-center justify-center bg-primary px-8 text-center"
      aria-label="Continue"
    >
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.05 }}
        className="flex items-center"
      >
        <div className="-mr-3">
          <Avatar name={mine} size={92} ring />
        </div>
        <div className="-ml-3">
          <Avatar name={theirs} size={92} ring />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.3 }}
        className="mt-7 text-[30px] font-bold leading-tight text-white"
      >
        You two should build something
      </motion.p>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
        className="mt-2 text-[15px] text-white/80"
      >
        You and {name.split(' ')[0]} complement each other.
      </motion.p>
    </motion.button>
  )
}

export default function MatchScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { profile, advance } = useApp()

  const [match, setMatch] = useState<Match | null>(null)
  const [reveal, setReveal] = useState(true)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  useEffect(() => {
    advance() // the card we connected with has left the stack
    api
      .match(id)
      .then((m) => {
        setMatch(m)
        setPicked(m.chosen_idea)
        // Coming back to an existing match skips the moment.
        if (m.chosen_idea !== null || m.chat.length > 0) setReveal(false)
      })
      .catch(() => nav('/swipe'))
    const t = setTimeout(() => setReveal(false), REVEAL_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function start() {
    if (!match || picked === null || picking) return
    setPicking(true)
    try {
      await api.chooseIdea(match.id, picked)
      nav(`/mission/${match.id}`)
    } catch {
      setPicking(false)
    }
  }

  if (!match) return <Loading label="Working out why you two…" />

  if (reveal && profile) {
    return <Reveal mine={profile.avatar} theirs={match.other.avatar} name={match.other.name} onDone={() => setReveal(false)} />
  }

  const first = match.other.name.split(' ')[0]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="flex min-h-full flex-col">
      <div className="flex-1 px-5 pb-28 pt-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <div className="-mr-2">
              <Avatar name={profile?.avatar ?? 'nova'} size={56} ring />
            </div>
            <Avatar name={match.other.avatar} size={56} ring />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[20px] font-semibold leading-tight">You + {first}</h1>
            <p className="truncate text-[13px] text-muted">{match.other.school}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] font-medium text-muted">Builder fit</p>
            <p className="text-[24px] font-semibold leading-none text-primary">{match.score.overall}</p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-1.5 text-[15px] font-semibold">Why you two</h2>
          <p className="text-[15px] leading-relaxed text-ink/85">{match.explanation}</p>
        </section>

        <Card className="mt-6 p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Your stacks fit</h2>
          <SkillBars bars={match.skill_bars} otherName={match.other.name} max={4} />
        </Card>

        <section className="mt-6">
          <h2 className="text-[15px] font-semibold">What you could build</h2>
          <p className="mb-3 text-[13px] text-muted">Pick one. You can change it later.</p>
          <div className="space-y-3">
            {match.ideas.map((idea, i) => (
              <IdeaCard
                key={idea.name + i}
                idea={idea}
                selected={picked === i}
                onSelect={() => setPicked(i)}
                otherName={match.other.name}
              />
            ))}
          </div>
        </section>
      </div>

      <div className="sticky bottom-0 border-t border-line bg-page/95 px-5 py-4 backdrop-blur">
        <Button disabled={picked === null || picking} onClick={start}>
          {picking ? 'Setting up…' : 'Start building together'}
          {!picking && <ArrowRight size={20} strokeWidth={1.75} />}
        </Button>
      </div>
    </motion.div>
  )
}
