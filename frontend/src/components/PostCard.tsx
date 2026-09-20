import { Heart, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import Avatar from '../assets/avatars/Avatar'
import { SEED_NOW, timeAgo } from '../lib/time'
import { useApp } from '../store'
import type { Post } from '../types'

/**
 * A post is a person, a time, some words, and two quiet actions. Likes and
 * replies live in component state only: the demo doesn't persist social actions.
 */
export default function PostCard({ post }: { post: Post }) {
  const nav = useNavigate()
  const { profile } = useApp()
  const [liked, setLiked] = useState(false)
  const [replying, setReplying] = useState(false)
  const [draft, setDraft] = useState('')
  const [comments, setComments] = useState<string[]>([])
  const now = post.id.startsWith('up_') ? Date.now() / 1000 : SEED_NOW

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setComments((c) => [...c, text])
    setDraft('')
  }

  return (
    <article className="border-b border-line bg-surface px-5 py-4">
      <div className="flex gap-3">
        <button type="button" onClick={() => nav(`/people/${post.author.id}`)} aria-label={post.author.name} className="shrink-0">
          <Avatar name={post.author.avatar} size={44} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <button type="button" onClick={() => nav(`/people/${post.author.id}`)} className="text-[15px] font-semibold">
              {post.author.name}
            </button>
            <span className="text-[13px] text-muted">
              {post.author.school} · {timeAgo(post.created_at, now)}
            </span>
          </div>
          {post.type === 'looking_for' && (
            <p className="mt-0.5 text-[12px] font-medium text-primary">Looking for a teammate</p>
          )}
          <p className="mt-1 whitespace-pre-wrap text-[16px] leading-relaxed">{post.text}</p>
          {post.project && (
            <p className="mt-1.5 text-[13px] text-muted">
              in <span className="font-medium text-ink/80">{post.project.name}</span>
            </p>
          )}
          <div className="mt-3 flex items-center gap-6 text-[13px] text-muted">
            <button
              type="button"
              onClick={() => setLiked(!liked)}
              aria-pressed={liked}
              className={`flex items-center gap-1.5 ${liked ? 'text-primary' : ''}`}
            >
              <Heart size={18} strokeWidth={1.75} fill={liked ? 'currentColor' : 'none'} />
              {post.likes + (liked ? 1 : 0)}
            </button>
            <button
              type="button"
              onClick={() => setReplying(!replying)}
              aria-expanded={replying}
              className={`flex items-center gap-1.5 ${replying ? 'text-ink' : ''}`}
            >
              <MessageCircle size={18} strokeWidth={1.75} />
              {comments.length > 0 ? comments.length : 'Reply'}
            </button>
          </div>

          {comments.length > 0 && (
            <div className="mt-3 space-y-2 border-l-2 border-line pl-3">
              {comments.map((c, i) => (
                <div key={i} className="flex items-start gap-2">
                  <Avatar name={profile?.avatar ?? 'nova'} size={22} />
                  <p className="text-[14px] leading-snug">
                    <span className="mr-1.5 font-semibold">{profile?.name ?? 'You'}</span>
                    {c}
                  </p>
                </div>
              ))}
            </div>
          )}

          {replying && (
            <form onSubmit={submit} className="mt-3 flex items-center gap-2">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Reply to ${post.author.name.split(' ')[0]}`}
                className="flex-1 rounded-full border border-line bg-page px-4 py-2 text-[14px]"
                autoFocus
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white disabled:opacity-40"
              >
                Reply
              </button>
            </form>
          )}
        </div>
      </div>
    </article>
  )
}
