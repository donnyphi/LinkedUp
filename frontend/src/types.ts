export type Level = 'learning' | 'solid' | 'expert'
export type Commitment = 'hackathon' | 'side_project' | 'cofounder'
export type Experience = 'first_hackathon' | 'shipped' | 'founded'
export type TeamSize = '2' | '3-4' | 'any'
export type Difficulty = 'weekend' | 'month' | 'startup'

export interface Skill {
  name: string
  level: Level
}

export interface Prompts {
  hackathon_person: string
  toxic_trait: string
  excited_about: string
}

export interface Profile {
  id: string
  name: string
  school: string
  avatar: string
  skills: Skill[]
  missing: string[]
  want_to_build: string
  commitment: Commitment
  experience: Experience
  team_size: TeamSize
  prompts: Prompts
  builder_title: string
  github?: string | null
}

export type ProfileIn = Omit<Profile, 'id' | 'builder_title'>

export interface Score {
  overall: number
  skills: number
  passion: number
  style: number
  commitment: number
  experience: number
}

export interface StackEntry {
  profile: Profile
  score: Score
  hook: string
  fills: string[]
}

export interface Idea {
  name: string
  one_liner: string
  roles: { me: string; them: string }
  difficulty: Difficulty
}

export interface Mission {
  steps: string[]
  done: boolean[]
}

export interface ChatMessage {
  from: 'me' | 'them'
  text: string
  ts: number
}

export interface SkillBar {
  name: string
  mine: number
  theirs: number
  fills_my_gap: boolean
  fills_their_gap: boolean
}

export interface Match {
  id: string
  user_id: string
  other_id: string
  other: Profile
  score: Score
  explanation: string
  ideas: Idea[]
  chosen_idea: number | null
  mission: Mission | null
  chat: ChatMessage[]
  fills: string[]
  skill_bars: SkillBar[]
}
