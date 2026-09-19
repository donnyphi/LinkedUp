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

/** The profile behind the "Demo fill" button. Matches backend/seed/roster.py. */
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
    { name: 'Backend', level: 'expert' },
    { name: 'ML / AI', level: 'solid' },
    { name: 'Data', level: 'solid' },
  ],
  missing: ['Product design', 'Visual design', 'Frontend'],
  want_to_build:
    'Something that helps people who make music discover collaborators and finish songs instead of hoarding 200 unfinished projects.',
  commitment: 'side_project',
  experience: 'shipped',
  team_size: '2',
  prompts: {
    hackathon_person: "...who writes the whole backend before anyone's agreed on what we're building",
    toxic_trait: "I'll say 'that's easy' and then disappear for 6 hours",
    excited_about: 'audio DSP and anything with a good API',
  },
}
