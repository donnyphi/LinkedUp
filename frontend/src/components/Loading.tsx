export default function Loading({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 animate-bounce rounded-full bg-accent"
            style={{ animationDelay: `${i * 0.12}s` }}
          />
        ))}
      </div>
      <p className="text-[15px] text-muted">{label}</p>
    </div>
  )
}
