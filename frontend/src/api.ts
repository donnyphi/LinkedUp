import type {
  ChatResponse,
  FeedItem,
  Match,
  PersonPage,
  PersonRow,
  Profile,
  ProfileIn,
  Project,
  Score,
  SeedThread,
  StackEntry,
  ThreadSummary,
} from './types'

const BASE = '/api'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    headers: { 'content-type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`${res.status} ${path} ${detail}`.trim())
  }
  return res.json() as Promise<T>
}

const post = <T,>(path: string, body?: unknown) =>
  call<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) })

export const api = {
  health: () => call<{ ok: boolean; model: string; live_ai: boolean }>('/health'),

  createProfile: (body: ProfileIn) =>
    post<{ profile: Profile; stack: StackEntry[] }>('/profile', body),

  session: () => call<{ profile: Profile | null; stack: StackEntry[] }>('/session'),

  stack: () => call<{ stack: StackEntry[] }>('/stack'),

  why: (other_id: string) => call<{ explanation: string; score: Score }>(`/why/${other_id}`),

  profile: (id: string) => call<Profile>(`/profiles/${id}`),

  swipe: (other_id: string, dir: 'left' | 'right') =>
    post<{ matched: boolean; match?: Match }>('/swipe', { other_id, dir }),

  match: (id: string) => call<Match>(`/match/${id}`),

  matches: () => call<{ matches: Match[] }>('/matches'),

  chooseIdea: (id: string, index: number) => post<Match>(`/match/${id}/idea`, { index }),

  toggleStep: (id: string, step: number) => post<Match>(`/match/${id}/mission/toggle`, { step }),

  sendChat: (id: string, text: string) => post<ChatResponse>(`/match/${id}/chat`, { text }),

  retryChat: (id: string) => post<ChatResponse>(`/match/${id}/chat/retry`),

  reset: () => post<{ ok: boolean }>('/reset'),

  // social layer
  feed: () => call<{ items: FeedItem[] }>('/feed'),
  people: () => call<{ people: PersonRow[] }>('/people'),
  person: (id: string) => call<PersonPage>(`/people/${id}`),
  connect: (other_id: string) => post<{ matched: boolean; match: Match }>('/connect', { other_id }),
  threads: () => call<{ threads: ThreadSummary[] }>('/threads'),
  thread: (id: string) => call<SeedThread>(`/threads/${id}`),
  project: (id: string) => call<Project & { team: Profile[]; update_posts: FeedItem[] }>(`/projects/${id}`),
}
