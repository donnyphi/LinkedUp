import { RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import Button from '../components/Button'
import Card from '../components/Card'
import { COMMITMENT_LABEL, EXPERIENCE_LABEL, TEAM_LABEL } from '../constants'
import { useApp } from '../store'

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

      <Card className="mt-5 p-5">
        <h2 className="mb-2 text-[13px] font-medium text-muted">What I bring</h2>
        <div className="flex flex-wrap gap-1.5">
          {profile.skills.map((s) => (
            <span key={s.name} className="rounded-full bg-page px-3 py-1.5 text-[13px] font-medium">
              {s.name}
              <span className="ml-1.5 text-muted">{s.level}</span>
            </span>
          ))}
        </div>

        <h2 className="mb-2 mt-5 text-[13px] font-medium text-muted">What I'm missing</h2>
        <div className="flex flex-wrap gap-1.5">
          {profile.missing.map((s) => (
            <span key={s} className="rounded-full bg-primary-soft px-3 py-1.5 text-[13px] font-medium text-primary">
              {s}
            </span>
          ))}
        </div>

        <h2 className="mb-1.5 mt-5 text-[13px] font-medium text-muted">What I want to build</h2>
        <p className="text-[14px] leading-snug">{profile.want_to_build}</p>

        <div className="mt-5 flex flex-wrap gap-2 text-[12px]">
          <span className="rounded-full bg-page px-3 py-1.5 font-medium">{COMMITMENT_LABEL[profile.commitment]}</span>
          <span className="rounded-full bg-page px-3 py-1.5 font-medium">{EXPERIENCE_LABEL[profile.experience]}</span>
          <span className="rounded-full bg-page px-3 py-1.5 font-medium">{TEAM_LABEL[profile.team_size]}</span>
        </div>
      </Card>

      <Button
        variant="secondary"
        className="mt-6"
        onClick={async () => {
          await restart()
          nav('/')
        }}
      >
        <RotateCcw size={16} strokeWidth={1.75} />
        Reset the demo
      </Button>
    </div>
  )
}
