import { useEffect, useState } from 'react'
import Loading from '../components/Loading'
import PostCard from '../components/PostCard'
import SuggestedConnection from '../components/SuggestedConnection'
import { api } from '../api'
import type { FeedItem } from '../types'

export default function Home() {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api
      .feed()
      .then((r) => setItems(r.items))
      .catch(() => setError(true))
  }, [])

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-10 border-b border-line bg-page/95 px-5 py-4 backdrop-blur">
        <h1 className="text-[22px] font-bold tracking-tight text-primary lg:hidden">LinkedUp</h1>
        <h1 className="hidden text-[20px] font-semibold lg:block">Home</h1>
      </header>

      {error && (
        <p className="px-5 py-10 text-center text-[14px] text-muted">
          The backend isn't answering. Start it and refresh.
        </p>
      )}
      {!items && !error && <Loading label="Loading your feed…" />}
      {items && items.length === 0 && (
        <p className="px-5 py-10 text-center text-[14px] text-muted">Nothing here yet.</p>
      )}
      {items?.map((it) =>
        it.kind === 'post' ? <PostCard key={it.id} post={it} /> : <SuggestedConnection key={it.id} s={it} />,
      )}
    </div>
  )
}
