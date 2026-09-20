import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, MessageSquare, RotateCcw, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Loading from '../components/Loading'
import PostCard from '../components/PostCard'
import SkillBars from '../components/SkillBars'
import { api } from '../api'
import { COMMITMENT_LABEL, EXPERIENCE_LABEL, TEAM_LABEL } from '../constants'
import { useApp } from '../store'
import type { PersonPage } from '../types'

/** A person, not a resume. Serves /people/:id and /profile (me). */
export default function People() {
  const { id } = useParams()
  const pid = id ?? 'me'
  const nav = useNavigate()
  const { restart } = useApp()
  const [page, setPage] = useState<PersonPage | null>(null)
  const [tab, setTab] = useState<'posts' | 'about'>('posts')
  const [why, setWhy] = useState<string | null>(null)
  const [whyOpen, setWhyOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setPage(null)
    setWhy(null)
    setWhyOpen(false)
    api.person(pid).then(setPage).catch(() => nav('/home'))
  }, [pid, nav])

  async function toggleWhy() {
    if (whyOpen) return setWhyOpen(false)
    setWhyOpen(true)
    if (why) return
    try {
      setWhy((await api.why(pid)).explanation)
    } catch {
      setWhy(page?.fit?.reason ?? '')
    }
  }

  async function connect() {
    if (!page || busy) return
    setBusy(true)
    try {
      const { match } = await api.connect(page.profile.id)
      nav(`/match/${match.id}`)
    } catch {
      setBusy(false)
    }
  }

  if (!page) return <Loading label="Opening profile…" />
  const { profile, fit } = page
  const first = profile.name.split(' ')[0]

  return (
    <div className="min-h-full pb-6">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-line bg-page/95 px-4 py-3 backdrop-blur">
        {!page.is_me && (
          <button type="button" onClick={() => nav(-1)} aria-label="Back" className="text-muted">
            <ArrowLeft size={20} strokeWidth={1.75} />
          </button>
        )}
        <h1 className="text-[17px] font-semibold">{page.is_me ? 'Your profile' : profile.name}</h1>
      </header>

      <div className="px-5 pt-5">
        <div className="flex items-start gap-4">
          <Avatar name={profile.avatar} size={72} />
          <div className="min-w-0 flex-1 pt-1">
            <h2 className="text-[22px] font-semibold leading-tight">{profile.name}</h2>
            <p className="text-[14px] text-muted">{profile.school}</p>
          </div>
        </div>
        <p className="mt-3 text-[17px] font-medium leading-snug">{profile.builder_title}</p>

        {!page.is_me && (
          <div className="mt-4 flex gap-2">
            {page.connected && page.match_id ? (
              <button
                type="button"
                onClick={() => nav(`/mission/${page.match_id}`)}
                className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-white"
              >
                <MessageSquare size={16} strokeWidth={2} />
                Message
              </button>
            ) : (
              <button
                type="button"
                onClick={connect}
                disabled={busy}
                className="rounded-full bg-primary px-5 py-2.5 text-[14px] font-semibold text-white active:bg-primary-pressed disabled:opacity-60"
              >
                {busy ? 'Connecting…' : 'Connect'}
              </button>
            )}
            {fit && (
              <button
                type="button"
                onClick={toggleWhy}
                className="flex items-center gap-1.5 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold"
              >
                <Sparkles size={16} strokeWidth={1.75} className="text-primary" />
                Why you two
              </button>
            )}
          </div>
        )}

        {page.is_me && (
          <button
            type="button"
            onClick={async () => {
              await restart()
              nav('/')
            }}
            className="mt-4 flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2.5 text-[14px] font-semibold text-muted"
          >
            <RotateCcw size={16} strokeWidth={1.75} />
            Reset the demo
          </button>
        )}

        <AnimatePresence initial={false}>
          {whyOpen && fit && (
            <motion.section
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-card border border-line bg-surface p-4">
                <p className="text-[12px] font-semibold text-primary">
                  {fit.fit_label} <span className="font-normal text-muted">· Builder fit {fit.score.overall}</span>
                </p>
                <p className="mt-2 text-[15px] leading-relaxed">{why ?? 'Thinking…'}</p>
                <div className="mt-4 border-t border-line pt-4">
                  <p className="mb-3 text-[13px] font-semibold">Your stacks fit</p>
                  <SkillBars bars={fit.skill_bars} otherName={profile.name} max={4} />
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {fit && !whyOpen && (
          <p className="mt-4 text-[14px] leading-snug text-muted">{fit.reason}</p>
        )}

        {page.projects.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-2 text-[13px] font-semibold text-muted">Currently building</h3>
            {page.projects.map((pr) => (
              <button
                key={pr.id}
                type="button"
                onClick={() => nav(`/projects/${pr.id}`)}
                className="mb-2 w-full rounded-card border border-line bg-surface px-4 py-3 text-left"
              >
                <p className="text-[16px] font-semibold">{pr.name}</p>
                <p className="text-[14px] text-muted">{pr.one_liner}</p>
              </button>
            ))}
          </section>
        )}

        <section className="mt-6">
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.skills.map((s) => (
              <span key={s.name} className="rounded-full bg-surface px-3 py-1.5 text-[13px] font-medium ring-1 ring-line">
                {s.name}
                <span className="ml-1.5 text-muted">{s.level}</span>
              </span>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-2 text-[13px] font-semibold text-muted">Looking for</h3>
          <div className="flex flex-wrap gap-1.5">
            {profile.missing.map((s) => (
              <span key={s} className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-medium text-primary">
                {s}
              </span>
            ))}
          </div>
        </section>

        <section className="mt-5">
          <h3 className="mb-1 text-[13px] font-semibold text-muted">Toxic trait as a teammate</h3>
          <p className="text-[15px] leading-snug">{profile.prompts.toxic_trait}</p>
        </section>
      </div>

      <div className="mt-6 flex border-b border-line px-5">
        {(['posts', 'about'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`mr-6 border-b-2 pb-2 text-[14px] font-semibold capitalize ${
              tab === t ? 'border-primary text-ink' : 'border-transparent text-muted'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'posts' &&
        (page.posts.length ? (
          page.posts.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <p className="px-5 py-8 text-center text-[14px] text-muted">
            {page.is_me ? "You haven't posted yet." : `${first} hasn't posted yet.`}
          </p>
        ))}

      {tab === 'about' && (
        <div className="space-y-5 px-5 pt-5">
          <div>
            <h3 className="mb-1 text-[13px] font-semibold text-muted">Wants to build</h3>
            <p className="text-[15px] leading-relaxed">{profile.want_to_build}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[12px]">
            <span className="rounded-full bg-surface px-3 py-1.5 font-medium ring-1 ring-line">{COMMITMENT_LABEL[profile.commitment]}</span>
            <span className="rounded-full bg-surface px-3 py-1.5 font-medium ring-1 ring-line">{EXPERIENCE_LABEL[profile.experience]}</span>
            <span className="rounded-full bg-surface px-3 py-1.5 font-medium ring-1 ring-line">{TEAM_LABEL[profile.team_size]}</span>
          </div>
          <div>
            <h3 className="mb-1 text-[13px] font-semibold text-muted">At a hackathon, the person who…</h3>
            <p className="text-[15px]">{profile.prompts.hackathon_person}</p>
          </div>
          <div>
            <h3 className="mb-1 text-[13px] font-semibold text-muted">Irrationally excited about</h3>
            <p className="text-[15px]">{profile.prompts.excited_about}</p>
          </div>
        </div>
      )}
    </div>
  )
}
