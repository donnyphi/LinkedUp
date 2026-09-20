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
  name: 'Alex Chen',
  school: 'MIT',
  avatar: 'nova',
  skills: [
    { name: 'Frontend', level: 'expert' },
    { name: 'Product design', level: 'solid' },
    { name: 'Visual design', level: 'solid' },
  ],
  missing: ['Backend', 'Data'],
  want_to_build:
    "Tools for cities and campuses. Starting with something that shows a neighborhood what's actually happening on their block, so neighbors stop relying on one chaotic group chat.",
  commitment: 'side_project',
  experience: 'shipped',
  team_size: '2',
  prompts: {
    hackathon_person: '...who has the UI running on a real phone before the backend exists',
    toxic_trait: "I'll redesign the empty state instead of fixing the bug",
    excited_about: 'public data that nobody can read, and making it readable',
  },
}
