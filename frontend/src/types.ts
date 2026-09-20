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
  you_bring: string[]
  fit_label: string
}

export interface Idea {
  name: string
  one_liner: string
  roles: { me: string; them: string }
  difficulty: Difficulty
  needs?: string[]
}

export interface Mission {
  steps: string[]
  done: boolean[]
}

export interface ChatMessage {
  from: 'me' | 'them' | 'system'
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
  you_bring: string[]
  skill_bars: SkillBar[]
  pending_reply: boolean
}

export type ChatStatus = 'ok' | 'no_key' | 'error'

export interface ChatResponse {
  status: ChatStatus
  match: Match
  error?: string
}

// ---- social layer ----------------------------------------------------------

export type PostType = 'update' | 'looking_for' | 'build_log' | 'idea' | 'question' | 'ship'

export interface PostAuthor {
  id: string
  name: string
  school: string
  avatar: string
  builder_title: string
}

export interface Post {
  id: string
  author_id: string
  type: PostType
  text: string
  project_id?: string | null
  created_at: number
  likes: number
  inferred?: { area?: string; needs?: string[]; platform?: string; commitment?: string }
  author: PostAuthor
  project: { id: string; name: string } | null
}

export interface Suggestion {
  kind: 'suggestion'
  id: string
  profile: Profile
  score: Score
  fit_label: string
  fills: string[]
  you_bring: string[]
  reason: string
  post_id: string | null
  connected: boolean
}

export type FeedItem = ({ kind: 'post' } & Post) | Suggestion

export interface Project {
  id: string
  name: string
  one_liner: string
  team_ids: string[]
  has: string[]
  needs: string[]
  stage: string
  updates: string[]
  tags?: string[]
  match_id?: string
  demo?: boolean
}

export interface ProjectPage extends Project {
  team: Profile[]
  update_posts: Post[]
}

export interface MissingPiece {
  candidate: {
    profile: Profile
    score: number
    covers: string[]
    reason: string
    connected: boolean
  } | null
  ranked: { id: string; name: string; score: number; covers: string[] }[]
}

export interface Fit {
  score: Score
  fit_label: string
  fills: string[]
  you_bring: string[]
  reason: string
  skill_bars: SkillBar[]
}

export interface PersonPage {
  profile: Profile
  posts: Post[]
  projects: Project[]
  is_me: boolean
  connected: boolean
  match_id: string | null
  fit: Fit | null
}

export interface PersonRow extends StackEntry {
  reason: string
  connected: boolean
}

export interface ThreadSummary {
  id: string
  kind: 'match' | 'seed'
  other: Profile
  read_only: boolean
  last: ChatMessage | null
  project: string | null
  done: number
  total: number
}

export interface SeedThread {
  id: string
  other_id: string
  read_only: boolean
  chat: ChatMessage[]
  other: Profile
}
