export function BarChart({ data, labels }: { data: number[]; labels: string[] }) {
  const max = Math.max(...data)
  return (
    <div className="flex h-48 items-end gap-2" role="img" aria-label="График активности по месяцам">
      {data.map((v, i) => (
        <div key={i} className="group flex flex-1 flex-col items-center gap-2">
          <span className="text-[10px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">{v}</span>
          <div className="w-full rounded-t-md bg-gradient-to-t from-primary/40 to-primary transition-all group-hover:to-cyan" style={{ height: `${(v / max) * 100}%` }} />
          <span className="text-[10px] text-muted-foreground">{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}
