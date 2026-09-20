/** "2h", "3d" — enough for a feed. */
export function timeAgo(tsSeconds: number, now = Date.now() / 1000): string {
  const s = Math.max(0, now - tsSeconds)
  if (s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

/** Seeded posts carry a fixed clock; render them relative to that, not to today. */
export const SEED_NOW = 1789900000
