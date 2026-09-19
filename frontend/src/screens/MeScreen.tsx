import { RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import { useApp } from '../store'

const COMMITMENT: Record<string, string> = {
  hackathon: 'This hackathon',
  side_project: 'Side project',
  cofounder: 'Cofounder',
}
const EXPERIENCE: Record<string, string> = {
  first_hackathon: 'First hackathon',
  shipped: 'Shipped things',
  founded: 'Founded something',
}

export default function MeScreen() {
  const { profile, restart } = useApp()
  const nav = useNavigate()
  if (!profile) return null

  return (
    <div className="px-5 pb-8 pt-6">
      <div className="flex items-center gap-3">
        <Avatar name={profile.avatar} size={60} />
        <div className="min-w-0">
          <h1 className="truncate text-[20px] font-semibold leading-tight">{profile.name}</h1>
          <p className="truncate text-[13px] text-muted">{profile.school}</p>
        </div>
      </div>

      <p className="mt-4 text-[17px] font-medium leading-snug">{profile.builder_title}</p>

      <section className="mt-6 rounded-3xl border border-[#EEE] bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <h2 className="mb-2 text-[12px] font-medium uppercase tracking-wide text-muted">
          What you're good at
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s) => (
            <span
              key={s.name}
              className="rounded-full bg-gray-100 px-3 py-1.5 text-[13px] font-medium"
            >
              {s.name}
              <span className="ml-1.5 text-muted">{s.level}</span>
            </span>
          ))}
        </div>

        <h2 className="mb-2 mt-5 text-[12px] font-medium uppercase tracking-wide text-muted">
          What you're missing
        </h2>
        <div className="flex flex-wrap gap-1.5">
          {profile.missing.map((s) => (
            <span
              key={s}
              className="rounded-full bg-accent/10 px-3 py-1.5 text-[13px] font-medium text-accent"
            >
              {s}
            </span>
          ))}
        </div>

        <h2 className="mb-1.5 mt-5 text-[12px] font-medium uppercase tracking-wide text-muted">
          What you want to build
        </h2>
        <p className="text-[14px] leading-snug">{profile.want_to_build}</p>

        <div className="mt-5 flex gap-2 text-[12px]">
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
            {COMMITMENT[profile.commitment]}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
            {EXPERIENCE[profile.experience]}
          </span>
          <span className="rounded-full bg-gray-100 px-3 py-1.5 font-medium">
            Team of {profile.team_size}
          </span>
        </div>
      </section>

      <button
        type="button"
        onClick={async () => {
          await restart()
          nav('/')
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border border-[#EEE] bg-white py-3.5 text-[14px] font-medium text-muted"
      >
        <RotateCcw size={16} strokeWidth={1.75} />
        Start the demo over
      </button>
    </div>
  )
}
