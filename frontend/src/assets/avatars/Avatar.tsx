/** Six geometric two-tone avatars, drawn inline. No photos, no external URLs. */

type Palette = { bg: string; ink: string }

// Warm, no purple: the brand's accent is pink/red and nothing here competes with it.
const PALETTES: Record<string, Palette> = {
  nova: { bg: '#FFE4EC', ink: '#E0447B' },
  juno: { bg: '#FFE7D9', ink: '#F0784B' },
  pixel: { bg: '#DDF3E4', ink: '#22A05B' },
  ember: { bg: '#FFF1C9', ink: '#D9950B' },
  koda: { bg: '#DCEEFF', ink: '#2F72D6' },
  wren: { bg: '#D8F3F0', ink: '#0F8F84' },
}

export const AVATAR_KEYS = Object.keys(PALETTES)

function Shapes({ name, ink }: { name: string; ink: string }) {
  switch (name) {
    case 'nova':
      return (
        <>
          <circle cx="32" cy="27" r="11" fill={ink} />
          <path d="M11 57c0-11 9-19 21-19s21 8 21 19" fill={ink} opacity="0.55" />
        </>
      )
    case 'juno':
      return (
        <>
          <rect x="21" y="16" width="22" height="22" rx="8" fill={ink} />
          <path d="M12 57c2-10 10-16 20-16s18 6 20 16" fill={ink} opacity="0.55" />
        </>
      )
    case 'pixel':
      return (
        <>
          <rect x="21" y="17" width="22" height="20" rx="4" fill={ink} />
          <rect x="26" y="23" width="4" height="4" fill="#fff" />
          <rect x="34" y="23" width="4" height="4" fill="#fff" />
          <rect x="15" y="42" width="34" height="15" rx="5" fill={ink} opacity="0.55" />
        </>
      )
    case 'ember':
      return (
        <>
          <path d="M32 13c7 8 11 13 11 19a11 11 0 1 1-22 0c0-6 4-11 11-19Z" fill={ink} />
          <path d="M13 57c1-9 9-14 19-14s18 5 19 14" fill={ink} opacity="0.5" />
        </>
      )
    case 'koda':
      return (
        <>
          <circle cx="32" cy="26" r="10" fill={ink} />
          <circle cx="19" cy="18" r="5" fill={ink} opacity="0.7" />
          <circle cx="45" cy="18" r="5" fill={ink} opacity="0.7" />
          <path d="M13 57c0-10 9-16 19-16s19 6 19 16" fill={ink} opacity="0.5" />
        </>
      )
    default:
      return (
        <>
          <path d="M32 15l10 8-4 14H26l-4-14 10-8Z" fill={ink} />
          <path d="M14 57c1-10 9-16 18-16s17 6 18 16" fill={ink} opacity="0.5" />
        </>
      )
  }
}

export default function Avatar({
  name,
  size = 48,
  ring = false,
}: {
  name: string
  size?: number
  ring?: boolean
}) {
  const key = PALETTES[name] ? name : 'nova'
  const { bg, ink } = PALETTES[key]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      className={ring ? 'rounded-full ring-[3px] ring-white' : 'rounded-full'}
      style={{ display: 'block', flexShrink: 0 }}
    >
      <rect width="64" height="64" rx="32" fill={bg} />
      <Shapes name={key} ink={ink} />
    </svg>
  )
}
