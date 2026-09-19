import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar, { AVATAR_KEYS } from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import { api } from '../api'
import { DEMO_USER, SKILLS } from '../constants'
import { useApp } from '../store'
import type { Commitment, Experience, Level, ProfileIn, TeamSize } from '../types'

const NEXT_LEVEL: Record<string, Level | null> = {
  none: 'learning',
  learning: 'solid',
  solid: 'expert',
  expert: null,
}

const LEVEL_TONE: Record<Level, string> = {
  learning: 'bg-accent/10 text-accent',
  solid: 'bg-accent/20 text-accent',
  expert: 'bg-accent text-white',
}

const COMMITMENTS: [Commitment, string][] = [
  ['hackathon', 'This hackathon'],
  ['side_project', 'Side project'],
  ['cofounder', 'Cofounder'],
]
const EXPERIENCES: [Experience, string][] = [
  ['first_hackathon', 'First one'],
  ['shipped', 'Shipped things'],
  ['founded', 'Founded something'],
]
const TEAMS: [TeamSize, string][] = [
  ['2', 'Just two'],
  ['3-4', '3–4'],
  ['any', 'Any size'],
]

const PROMPT_LABELS = {
  hackathon_person: "I'm the hackathon person…",
  toxic_trait: 'My toxic trait as a teammate',
  excited_about: "I'm irrationally excited about",
} as const

const PROMPT_HINTS = {
  hackathon_person: '…who renames the repo four times',
  toxic_trait: 'Be honest. It is funnier.',
  excited_about: 'The thing you will not shut up about',
} as const

function Section({
  n,
  title,
  children,
}: {
  n: number
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 flex items-baseline gap-2 text-[15px] font-semibold">
        <span className="text-[12px] font-medium text-muted">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-1.5 rounded-2xl bg-gray-100 p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-xl px-2 py-2.5 text-[13px] font-medium transition-colors ${
            value === key ? 'bg-white text-ink shadow-sm' : 'text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

export default function Onboarding() {
  const nav = useNavigate()
  const { setProfile, setStack } = useApp()

  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_KEYS[0])
  const [levels, setLevels] = useState<Record<string, Level>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [want, setWant] = useState('')
  const [commitment, setCommitment] = useState<Commitment>('side_project')
  const [experience, setExperience] = useState<Experience>('shipped')
  const [team, setTeam] = useState<TeamSize>('2')
  const [prompts, setPrompts] = useState({
    hackathon_person: '',
    toxic_trait: '',
    excited_about: '',
  })

  const [phase, setPhase] = useState<'form' | 'loading' | 'title'>('form')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const skills = useMemo(
    () => Object.entries(levels).map(([n, level]) => ({ name: n, level })),
    [levels],
  )

  const filled = [
    name.trim().length > 0,
    skills.length > 0,
    missing.length > 0,
    want.trim().length > 0,
    prompts.hackathon_person.trim().length > 0,
    prompts.toxic_trait.trim().length > 0,
    prompts.excited_about.trim().length > 0,
  ]
  const progress = filled.filter(Boolean).length / filled.length
  const ready = filled.every(Boolean)

  function cycleSkill(skill: string) {
    setLevels((prev) => {
      const next = NEXT_LEVEL[prev[skill] ?? 'none']
      const copy = { ...prev }
      if (next) copy[skill] = next
      else delete copy[skill]
      return copy
    })
  }

  function toggleMissing(skill: string) {
    setMissing((prev) => (prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]))
  }

  function demoFill() {
    setName(DEMO_USER.name)
    setSchool(DEMO_USER.school)
    setAvatar(DEMO_USER.avatar)
    setLevels(Object.fromEntries(DEMO_USER.skills.map((s) => [s.name, s.level])))
    setMissing([...DEMO_USER.missing])
    setWant(DEMO_USER.want_to_build)
    setCommitment(DEMO_USER.commitment)
    setExperience(DEMO_USER.experience)
    setTeam(DEMO_USER.team_size)
    setPrompts({ ...DEMO_USER.prompts })
  }

  async function submit() {
    setPhase('loading')
    setError('')
    const body: ProfileIn = {
      name: name.trim(),
      school: school.trim(),
      avatar,
      skills,
      missing,
      want_to_build: want.trim(),
      commitment,
      experience,
      team_size: team,
      prompts,
      github: null,
    }
    try {
      const { profile, stack } = await api.createProfile(body)
      setProfile(profile)
      setStack(stack)
      setTitle(profile.builder_title)
      setPhase('title')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something broke')
      setPhase('form')
    }
  }

  if (phase === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center">
        <Loading label="Reading your profile…" />
      </div>
    )
  }

  if (phase === 'title') {
    return (
      <div className="flex min-h-full flex-col justify-center px-6 py-16">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 flex items-center gap-2 text-[13px] font-medium text-muted"
        >
          <Sparkles size={16} strokeWidth={1.75} className="text-accent" />
          Here's how we'll introduce you
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 22 }}
          className="rounded-3xl border border-[#EEE] bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
        >
          <Avatar name={avatar} size={56} />
          <p className="mt-4 text-[22px] font-semibold leading-snug">{title}</p>
          <p className="mt-2 text-[14px] text-muted">
            {name}
            {school ? ` · ${school}` : ''}
          </p>
        </motion.div>
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          type="button"
          onClick={() => nav('/swipe')}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-accent py-4 text-[16px] font-semibold text-white"
        >
          Continue
          <ArrowRight size={20} strokeWidth={1.75} />
        </motion.button>
      </div>
    )
  }

  return (
    <div className="pb-28">
      <div className="sticky top-0 z-10 bg-page/95 px-6 pb-3 pt-6 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-[22px] font-semibold tracking-tight">Your profile</h1>
          <button
            type="button"
            onClick={demoFill}
            className="flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-[12px] font-medium text-muted"
          >
            <Wand2 size={14} strokeWidth={1.75} />
            Demo fill
          </button>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-gray-200">
          <motion.div
            className="h-full rounded-full bg-accent"
            animate={{ width: `${progress * 100}%` }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
          />
        </div>
      </div>

      <div className="px-6 pt-4">
        <Section n={1} title="Who you are">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name"
            className="mb-2 w-full rounded-2xl border border-[#EEE] bg-white px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
          <input
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            placeholder="School"
            className="w-full rounded-2xl border border-[#EEE] bg-white px-4 py-3 text-[15px] outline-none focus:border-accent"
          />
          <div className="mt-3 flex gap-2">
            {AVATAR_KEYS.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAvatar(a)}
                className={`rounded-full p-0.5 transition-all ${
                  avatar === a ? 'ring-2 ring-accent' : 'opacity-60'
                }`}
              >
                <Avatar name={a} size={42} />
              </button>
            ))}
          </div>
        </Section>

        <Section n={2} title="What you're good at">
          <p className="mb-3 -mt-1 text-[13px] text-muted">Tap once, twice, three times.</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => {
              const level = levels[s]
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => cycleSkill(s)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                    level ? LEVEL_TONE[level] : 'bg-gray-100 text-muted'
                  }`}
                >
                  {s}
                  {level && <span className="ml-1.5 opacity-70">{level}</span>}
                </button>
              )
            })}
          </div>
        </Section>

        <Section n={3} title="What you're missing">
          <p className="mb-3 -mt-1 text-[13px] text-muted">The reason you need somebody else.</p>
          <div className="flex flex-wrap gap-1.5">
            {SKILLS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => toggleMissing(s)}
                className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  missing.includes(s) ? 'bg-ink text-white' : 'bg-gray-100 text-muted'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </Section>

        <Section n={4} title="What you want to build">
          <textarea
            value={want}
            maxLength={200}
            rows={4}
            onChange={(e) => setWant(e.target.value)}
            placeholder="Be specific. The vaguer this is, the worse your matches get."
            className="w-full resize-none rounded-2xl border border-[#EEE] bg-white px-4 py-3 text-[15px] leading-snug outline-none focus:border-accent"
          />
          <p className="mt-1 text-right text-[11px] text-muted">{want.length}/200</p>
        </Section>

        <Section n={5} title="What you're looking for">
          <div className="space-y-3">
            <div>
              <p className="mb-1.5 text-[12px] text-muted">How far you want to take it</p>
              <Segmented options={COMMITMENTS} value={commitment} onChange={setCommitment} />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] text-muted">How much you've built before</p>
              <Segmented options={EXPERIENCES} value={experience} onChange={setExperience} />
            </div>
            <div>
              <p className="mb-1.5 text-[12px] text-muted">Team size</p>
              <Segmented options={TEAMS} value={team} onChange={setTeam} />
            </div>
          </div>
        </Section>

        <Section n={6} title="Three questions">
          <div className="space-y-3">
            {(Object.keys(PROMPT_LABELS) as (keyof typeof PROMPT_LABELS)[]).map((k) => (
              <div key={k}>
                <label className="mb-1.5 block text-[13px] font-medium">{PROMPT_LABELS[k]}</label>
                <input
                  value={prompts[k]}
                  onChange={(e) => setPrompts((p) => ({ ...p, [k]: e.target.value }))}
                  placeholder={PROMPT_HINTS[k]}
                  className="w-full rounded-2xl border border-[#EEE] bg-white px-4 py-3 text-[15px] outline-none focus:border-accent"
                />
              </div>
            ))}
          </div>
        </Section>

        <AnimatePresence>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-[13px] text-red-600"
            >
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="button"
          disabled={!ready}
          onClick={submit}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[16px] font-semibold transition-colors ${
            ready ? 'bg-accent text-white' : 'bg-gray-200 text-gray-400'
          }`}
        >
          {ready ? 'Find my people' : 'Fill in the blanks first'}
          {ready && <ArrowRight size={20} strokeWidth={1.75} />}
        </button>
      </div>
    </div>
  )
}
