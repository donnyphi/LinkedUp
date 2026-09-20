import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'ghost'
  full?: boolean
}

/** The one button language. Primary is pink, and it is the only loud thing on any screen. */
export default function Button({ children, variant = 'primary', full = true, className = '', ...rest }: Props) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3.5 text-[16px] font-semibold transition-colors disabled:cursor-not-allowed'
  const look = {
    primary: 'bg-primary text-white active:bg-primary-pressed disabled:bg-line disabled:text-muted',
    secondary: 'border border-line bg-surface text-ink active:bg-page disabled:text-muted',
    ghost: 'text-muted active:text-ink',
  }[variant]
  return (
    <button type="button" className={`${base} ${look} ${full ? 'w-full' : ''} ${className}`} {...rest}>
      {children}
    </button>
  )
}
