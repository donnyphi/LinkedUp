import type { ReactNode } from 'react'

/** The one card treatment. Every surface in the app uses this so they all match. */
export default function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-card border border-line bg-surface shadow-card ${className}`}>
      {children}
    </div>
  )
}
