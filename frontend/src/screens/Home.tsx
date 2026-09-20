import { Plus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import CreateSheet from '../components/CreateSheet'
import Loading from '../components/Loading'
import PostCard from '../components/PostCard'
import SuggestedConnection from '../components/SuggestedConnection'
import { api } from '../api'
import { useCreate } from '../store'
import type { FeedItem } from '../types'

export default function Home() {
  const [items, setItems] = useState<FeedItem[] | null>(null)
  const [error, setError] = useState(false)
  const { open, setOpen, version } = useCreate()

  const load = useCallback(() => {
    api
      .feed()
      .then((r) => setItems(r.items))
      .catch(() => setError(true))
  }, [])

  useEffect(load, [load, version])

  return (
    <div className="relative min-h-full">
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

      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Create"
        className="fixed bottom-20 right-5 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-[0_8px_24px_rgba(255,10,84,0.3)] lg:hidden"
      >
        <Plus size={26} strokeWidth={2} />
      </button>
      <CreateSheet open={open} onClose={() => setOpen(false)} onPosted={() => window.scrollTo({ top: 0 })} />
    </div>
  )
}
