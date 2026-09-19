import { motion } from 'framer-motion'
import { ArrowRight, Link2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import IdeaCard from '../components/IdeaCard'
import Loading from '../components/Loading'
import SkillBars from '../components/SkillBars'
import { api } from '../api'
import { useApp } from '../store'
import type { Match } from '../types'

function Overlay({ mine, theirs }: { mine: string; theirs: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full min-h-[560px] flex-col items-center justify-center bg-accent"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 18 }}
        className="flex items-center"
      >
        <div className="-mr-4">
          <Avatar name={mine} size={84} ring />
        </div>
        <div className="z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-accent shadow">
          <Link2 size={18} strokeWidth={2} />
        </div>
        <div className="-ml-4">
          <Avatar name={theirs} size={84} ring />
        </div>
      </motion.div>
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 text-[30px] font-semibold text-white"
      >
        It's a Link
      </motion.p>
    </motion.div>
  )
}

export default function MatchScreen() {
  const { id = '' } = useParams()
  const nav = useNavigate()
  const { profile, advance } = useApp()

  const [match, setMatch] = useState<Match | null>(null)
  const [overlay, setOverlay] = useState(true)
  const [picking, setPicking] = useState(false)
  const [picked, setPicked] = useState<number | null>(null)

  useEffect(() => {
    // Leaving this card behind means the stack should move on.
    advance()
    api
      .match(id)
      .then((m) => {
        setMatch(m)
        setPicked(m.chosen_idea)
      })
      .catch(() => nav('/swipe'))
    const t = setTimeout(() => setOverlay(false), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function pick(index: number) {
    if (!match || picking) return
    setPicking(true)
    setPicked(index)
    try {
      const updated = await api.chooseIdea(match.id, index)
      setMatch(updated)
      nav(`/mission/${match.id}`)
    } catch {
      setPicking(false)
      setPicked(match.chosen_idea)
    }
  }

  // The overlay owns the whole frame for its one second. Layering it over the
  // match content instead would centre it against the scroll height, not the screen.
  if (overlay || !match) {
    return match && profile ? (
      <Overlay mine={profile.avatar} theirs={match.other.avatar} />
    ) : (
      <Loading label="Working out why you two…" />
    )
  }

  return (
    <div className="relative min-h-full">
      {!match ? (
        <Loading label="Working out why you two…" />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.25 }}
          className="px-5 pb-10 pt-6"
        >
          <div className="flex items-center gap-3">
            <Avatar name={match.other.avatar} size={52} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[20px] font-semibold leading-tight">
                {match.other.name}
              </h1>
              <p className="truncate text-[13px] text-muted">{match.other.school}</p>
            </div>
            <span className="text-[26px] font-semibold text-accent">{match.score.overall}%</span>
          </div>

          <section className="mt-6">
            <h2 className="mb-2 text-[13px] font-medium uppercase tracking-wide text-muted">
              Why you two
            </h2>
            <p className="text-[16px] leading-relaxed">{match.explanation}</p>
          </section>

          <section className="mt-7 rounded-3xl border border-[#EEE] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
            <h2 className="mb-4 text-[13px] font-medium uppercase tracking-wide text-muted">
              Skill fit
            </h2>
            <SkillBars bars={match.skill_bars} otherName={match.other.name} />
          </section>

          <section className="mt-7">
            <h2 className="mb-1 text-[13px] font-medium uppercase tracking-wide text-muted">
              What you could build
            </h2>
            <p className="mb-3 text-[13px] text-muted">Pick one. You can change it later.</p>
            <div className="space-y-3">
              {match.ideas.map((idea, i) => (
                <IdeaCard
                  key={idea.name + i}
                  idea={idea}
                  selected={picked === i}
                  onSelect={() => pick(i)}
                  otherName={match.other.name}
                />
              ))}
            </div>
          </section>

          <button
            type="button"
            disabled={picked === null || picking}
            onClick={() => picked !== null && pick(picked)}
            className={`mt-7 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-semibold transition-colors ${
              picked === null ? 'bg-gray-200 text-gray-400' : 'bg-accent text-white'
            }`}
          >
            {picked === null ? 'Pick one to start' : 'Start your first build'}
            {picked !== null && <ArrowRight size={20} strokeWidth={1.75} />}
          </button>
        </motion.div>
      )}
    </div>
  )
}
