import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, ChevronDown, Sparkles, Wand2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar, { AVATAR_KEYS } from '../assets/avatars/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import Loading from '../components/Loading'
import { api } from '../api'
import { COMMITMENT_LABEL, DEMO_USER, EXPERIENCE_LABEL, SKILL_GROUPS, TEAM_LABEL } from '../constants'
import { useApp } from '../store'
import type { Commitment, Experience, Level, ProfileIn, TeamSize } from '../types'

const NEXT_LEVEL: Record<string, Level | null> = {
  none: 'learning',
  learning: 'solid',
  solid: 'expert',
  expert: null,
}

const LEVEL_TONE: Record<Level, string> = {
  learning: 'bg-primary-soft text-primary',
  solid: 'bg-primary/20 text-primary-pressed',
  expert: 'bg-primary text-white',
}

const PROMPT_LABELS = {
  hackathon_person: "At a hackathon, I'm the person who…",
  toxic_trait: 'My toxic trait as a teammate…',
  excited_about: "I'm irrationally excited about…",
} as const

const PROMPT_HINTS = {
  hackathon_person: '…renames the repo four times',
  toxic_trait: 'Be honest. It is funnier.',
  excited_about: "The thing you won't shut up about",
} as const

const STAGE_TITLES = ['Who are you?', 'What do you bring?', 'What do you want to build?']

function Field({ label, children }: { label?: string; children: ReactNode }) {
  return (
    <div>
      {label && <p className="mb-1.5 text-[13px] font-medium text-muted">{label}</p>}
      {children}
    </div>
  )
}

const inputCls =
  'w-full rounded-2xl border border-line bg-surface px-4 py-3 text-[15px] transition-colors placeholder:text-muted/70'

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
    <div className="flex gap-1 rounded-2xl bg-line/60 p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-xl px-2 py-2.5 text-[13px] font-medium transition-colors ${
            value === key ? 'bg-surface text-ink shadow-card' : 'text-muted'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/** One skill group. Collapsed groups still show what's picked in them. */
function SkillGroup({
  label,
  skills,
  open,
  onToggle,
  render,
  picked,
}: {
  label: string
  skills: string[]
  open: boolean
  onToggle: () => void
  render: (skill: string) => ReactNode
  picked: string[]
}) {
  return (
    <div className="rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{label}</p>
          {!open && picked.length > 0 && (
            <p className="mt-0.5 truncate text-[12px] text-primary">{picked.join(' · ')}</p>
          )}
          {!open && picked.length === 0 && (
            <p className="mt-0.5 text-[12px] text-muted">{skills.length} skills</p>
          )}
        </div>
        <ChevronDown
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap gap-1.5 px-4 pb-4">{skills.map(render)}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function Onboarding() {
  const nav = useNavigate()
  const { setProfile, setStack } = useApp()

  const [stage, setStage] = useState(0)
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [avatar, setAvatar] = useState(AVATAR_KEYS[0])
  const [levels, setLevels] = useState<Record<string, Level>>({})
  const [missing, setMissing] = useState<string[]>([])
  const [want, setWant] = useState('')
  const [commitment, setCommitment] = useState<Commitment>('side_project')
  const [experience, setExperience] = useState<Experience>('shipped')
  const [team, setTeam] = useState<TeamSize>('2')
  const [prompts, setPrompts] = useState({ hackathon_person: '', toxic_trait: '', excited_about: '' })
  const [openGood, setOpenGood] = useState<string>(SKILL_GROUPS[0].label)
  const [openMissing, setOpenMissing] = useState<string>(SKILL_GROUPS[0].label)

  const [phase, setPhase] = useState<'form' | 'loading' | 'title'>('form')
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')

  const skills = useMemo(
    () => Object.entries(levels).map(([n, level]) => ({ name: n, level })),
    [levels],
  )

  const stageReady = [
    name.trim().length > 0,
    skills.length > 0 && missing.length > 0,
    want.trim().length > 0 &&
      prompts.hackathon_person.trim().length > 0 &&
      prompts.toxic_trait.trim().length > 0 &&
      prompts.excited_about.trim().length > 0,
  ]

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
    setStage(2) // everything is filled - land on the last stage so submit is one tap away
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
          className="mb-5 flex items-center gap-2 text-[13px] font-medium text-muted"
        >
          <Sparkles size={16} strokeWidth={1.75} className="text-primary" />
          Here's how we'll introduce you
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 220, damping: 22 }}
        >
          <Card className="p-6">
            <Avatar name={avatar} size={56} />
            <p className="mt-4 text-[22px] font-semibold leading-snug">{title}</p>
            <p className="mt-2 text-[14px] text-muted">
              {name}
              {school ? ` · ${school}` : ''}
            </p>
            <div className="mt-5 space-y-3 border-t border-line pt-4 text-[13px]">
              <div>
                <p className="mb-1.5 font-medium text-muted">You bring</p>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s.name} className="rounded-full bg-page px-3 py-1 font-medium">
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 font-medium text-muted">You're missing</p>
                <div className="flex flex-wrap gap-1.5">
                  {missing.map((s) => (
                    <span key={s} className="rounded-full bg-primary-soft px-3 py-1 font-medium text-primary">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1 font-medium text-muted">You want to build</p>
                <p className="leading-snug">{want}</p>
              </div>
            </div>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-6">
          <Button onClick={() => nav('/home')}>
            Go to Home
            <ArrowRight size={20} strokeWidth={1.75} />
          </Button>
        </motion.div>
      </div>
    )
  }

  const last = stage === STAGE_TITLES.length - 1

  return (
    <div className="flex min-h-full flex-col">
      <div className="sticky top-0 z-10 bg-page/95 px-6 pb-3 pt-6 backdrop-blur">
        <div className="mb-3 flex gap-1.5">
          {STAGE_TITLES.map((_, i) => (
            <span
              key={i}
              className={`h-1 flex-1 rounded-full transition-colors ${i <= stage ? 'bg-primary' : 'bg-line'}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[12px] font-medium text-muted">Step {stage + 1} of 3</p>
            <h1 className="text-[22px] font-semibold tracking-tight">{STAGE_TITLES[stage]}</h1>
          </div>
          {stage === 0 && (
            <button
              type="button"
              onClick={demoFill}
              className="flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1.5 text-[12px] font-medium text-primary"
            >
              <Wand2 size={14} strokeWidth={1.75} />
              Demo fill
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stage}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.18 }}
            className="space-y-5"
          >
            {stage === 0 && (
              <>
                <Field label="Name">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className={inputCls} />
                </Field>
                <Field label="School">
                  <input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="Where you study" className={inputCls} />
                </Field>
                <Field label="Pick an avatar">
                  <div className="flex gap-2">
                    {AVATAR_KEYS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAvatar(a)}
                        aria-label={a}
                        className={`rounded-full p-0.5 transition-all ${avatar === a ? 'ring-2 ring-primary' : 'opacity-55'}`}
                      >
                        <Avatar name={a} size={44} />
                      </button>
                    ))}
                  </div>
                </Field>
              </>
            )}

            {stage === 1 && (
              <>
                <div>
                  <p className="text-[15px] font-semibold">What you're good at</p>
                  <p className="mb-3 text-[13px] text-muted">Tap once, twice, three times to set the level.</p>
                  <div className="space-y-2">
                    {SKILL_GROUPS.map((g) => (
                      <SkillGroup
                        key={g.label}
                        label={g.label}
                        skills={g.skills}
                        open={openGood === g.label}
                        onToggle={() => setOpenGood(openGood === g.label ? '' : g.label)}
                        picked={g.skills.filter((s) => levels[s])}
                        render={(s) => {
                          const level = levels[s]
                          return (
                            <button
                              key={s}
                              type="button"
                              onClick={() => cycleSkill(s)}
                              className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                                level ? LEVEL_TONE[level] : 'bg-page text-muted'
                              }`}
                            >
                              {s}
                              {level && <span className="ml-1.5 opacity-75">{level}</span>}
                            </button>
                          )
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[15px] font-semibold">What you're missing</p>
                  <p className="mb-3 text-[13px] text-muted">The reason you need somebody else.</p>
                  <div className="space-y-2">
                    {SKILL_GROUPS.map((g) => (
                      <SkillGroup
                        key={g.label}
                        label={g.label}
                        skills={g.skills}
                        open={openMissing === g.label}
                        onToggle={() => setOpenMissing(openMissing === g.label ? '' : g.label)}
                        picked={g.skills.filter((s) => missing.includes(s))}
                        render={(s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => toggleMissing(s)}
                            className={`rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors ${
                              missing.includes(s) ? 'bg-ink text-white' : 'bg-page text-muted'
                            }`}
                          >
                            {s}
                          </button>
                        )}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {stage === 2 && (
              <>
                <Field label="What do you want to build?">
                  <textarea
                    value={want}
                    maxLength={200}
                    rows={4}
                    onChange={(e) => setWant(e.target.value)}
                    placeholder="Be specific. The vaguer this is, the worse your matches get."
                    className={`${inputCls} resize-none leading-snug`}
                  />
                  <p className="mt-1 text-right text-[11px] text-muted">{want.length}/200</p>
                </Field>
                <Field label="How far you want to take it">
                  <Segmented
                    options={Object.entries(COMMITMENT_LABEL) as [Commitment, string][]}
                    value={commitment}
                    onChange={setCommitment}
                  />
                </Field>
                <Field label="How much you've built before">
                  <Segmented
                    options={Object.entries(EXPERIENCE_LABEL) as [Experience, string][]}
                    value={experience}
                    onChange={setExperience}
                  />
                </Field>
                <Field label="Team size">
                  <Segmented options={Object.entries(TEAM_LABEL) as [TeamSize, string][]} value={team} onChange={setTeam} />
                </Field>
                <div className="space-y-3 border-t border-line pt-5">
                  {(Object.keys(PROMPT_LABELS) as (keyof typeof PROMPT_LABELS)[]).map((k) => (
                    <Field key={k} label={PROMPT_LABELS[k]}>
                      <input
                        value={prompts[k]}
                        onChange={(e) => setPrompts((p) => ({ ...p, [k]: e.target.value }))}
                        placeholder={PROMPT_HINTS[k]}
                        className={inputCls}
                      />
                    </Field>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {error && (
          <p className="mt-4 rounded-2xl bg-primary-soft px-4 py-3 text-[13px] text-primary-pressed">{error}</p>
        )}
      </div>

      <div className="sticky bottom-0 flex gap-2 border-t border-line bg-page/95 px-6 py-4 backdrop-blur">
        {stage > 0 && (
          <Button variant="secondary" full={false} onClick={() => setStage(stage - 1)} aria-label="Back">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </Button>
        )}
        <Button
          disabled={!stageReady[stage]}
          onClick={() => (last ? submit() : setStage(stage + 1))}
        >
          {last ? 'Find my people' : 'Next'}
          <ArrowRight size={20} strokeWidth={1.75} />
        </Button>
      </div>
    </div>
  )
}
