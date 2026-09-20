import type { Commitment, Experience, Level, Prompts, TeamSize } from './types'

export const SKILLS = [
  'Frontend',
  'Backend',
  'Mobile (iOS)',
  'Mobile (Android)',
  'ML / AI',
  'Data',
  'DevOps / Infra',
  'Systems / Low-level',
  'Security',
  'Game dev',
  'Hardware / Embedded',
  'Product design',
  'Visual design',
  'UX research',
  'Motion / 3D',
  'Product management',
  'Marketing / Growth',
  'Sales / BD',
  'Fundraising',
  'Finance',
  'Writing / Content',
  'Community',
  'Video',
  'Music production',
]

/** The same 24 skills, grouped so onboarding is never one undifferentiated chip cloud. */
export const SKILL_GROUPS: { label: string; skills: string[] }[] = [
  {
    label: 'Engineering',
    skills: [
      'Frontend',
      'Backend',
      'Mobile (iOS)',
      'Mobile (Android)',
      'ML / AI',
      'Data',
      'DevOps / Infra',
      'Systems / Low-level',
      'Security',
      'Game dev',
      'Hardware / Embedded',
    ],
  },
  { label: 'Design', skills: ['Product design', 'Visual design', 'UX research', 'Motion / 3D'] },
  {
    label: 'Product & growth',
    skills: ['Product management', 'Marketing / Growth', 'Sales / BD', 'Fundraising', 'Finance'],
  },
  { label: 'Other', skills: ['Writing / Content', 'Community', 'Video', 'Music production'] },
]

export const COMMITMENT_LABEL: Record<Commitment, string> = {
  hackathon: 'This hackathon',
  side_project: 'Side project',
  cofounder: 'Cofounder',
}
export const EXPERIENCE_LABEL: Record<Experience, string> = {
  first_hackathon: 'First hackathon',
  shipped: 'Shipped things',
  founded: 'Founded something',
}
export const TEAM_LABEL: Record<TeamSize, string> = { '2': 'Just two', '3-4': '3–4 people', any: 'Any size' }

export const SCOPE_LABEL: Record<string, string> = {
  weekend: 'Weekend',
  month: 'A month',
  startup: 'The long game',
}

/** The profile behind the "Demo fill" button. Mirrors backend/seed/roster.py DEMO_USER. */
export const DEMO_USER: {
  name: string
  school: string
  avatar: string
  skills: { name: string; level: Level }[]
  missing: string[]
  want_to_build: string
  commitment: Commitment
  experience: Experience
  team_size: TeamSize
  prompts: Prompts
} = {
  name: 'Donny',
  school: 'MIT',
  avatar: 'nova',
  skills: [
    { name: 'Frontend', level: 'expert' },
    { name: 'Product design', level: 'solid' },
    { name: 'Product management', level: 'solid' },
    { name: 'Writing / Content', level: 'learning' },
  ],
  missing: ['Backend', 'Data'],
  want_to_build:
    'Campus tools people actually use. Right now: which dining halls are actually crowded, live, so nobody walks across campus into a 40-minute line.',
  commitment: 'side_project',
  experience: 'shipped',
  team_size: '2',
  prompts: {
    hackathon_person: '...who has the landing page done before we agree on the idea',
    toxic_trait: 'I will redesign the whole screen at 3am and call it a small tweak',
    excited_about: 'any campus system with a public API',
  },
}
