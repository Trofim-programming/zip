'use client'

import { useState } from 'react'
import { CheckCircle2, Play, RotateCcw, Terminal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { runPython, type RunResult } from '@/lib/runner'
import { cn } from '@/lib/utils'

type Props = {
  initialCode: string
  filename?: string
  onCheck?: (code: string, result: RunResult) => void
  actions?: React.ReactNode
  className?: string
  minHeight?: string
}

export function CodeEditor({ initialCode, filename = 'main.py', onCheck, actions, className, minHeight = 'min-h-48' }: Props) {
  const [code, setCode] = useState(initialCode)
  const [result, setResult] = useState<RunResult | null>(null)
  const [running, setRunning] = useState(false)
  const lines = code.split('\n').length

  const run = () => {
    setRunning(true)
    setTimeout(() => {
      setResult(runPython(code))
      setRunning(false)
    }, 350)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const t = e.currentTarget
      const s = t.selectionStart
      const next = code.slice(0, s) + '    ' + code.slice(t.selectionEnd)
      setCode(next)
      requestAnimationFrame(() => t.setSelectionRange(s + 4, s + 4))
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run()
  }

  return (
    <div className={cn('overflow-hidden rounded-2xl border bg-[#0b0c10]', className)}>
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-md bg-secondary px-2 py-1 font-mono">{filename}</span>
          <span className="text-muted-foreground">Python 3.12</span>
        </div>
        <button onClick={() => { setCode(initialCode); setResult(null) }} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <RotateCcw className="size-3" /> Сбросить
        </button>
      </div>
      <div className="flex font-mono text-sm leading-6">
        <div className="select-none border-r px-3 py-3 text-right text-muted-foreground/50" aria-hidden="true">
          {Array.from({ length: lines }).map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          aria-label="Редактор кода"
          className={cn('flex-1 resize-none bg-transparent p-3 text-foreground caret-cyan outline-none', minHeight)}
          rows={Math.max(lines, 6)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t bg-card px-4 py-3">
        <Button onClick={run} disabled={running} size="lg">
          <Play /> {running ? 'Выполняется…' : 'Запустить код'}
        </Button>
        {onCheck && (
          <Button variant="outline" size="lg" onClick={() => { const r = runPython(code); setResult(r); onCheck(code, r) }}>
            <CheckCircle2 /> Проверить
          </Button>
        )}
        {actions}
        <span className="ml-auto hidden text-xs text-muted-foreground sm:block">Ctrl + Enter — запуск</span>
      </div>
      <div className="border-t bg-black/40 px-4 py-3 font-mono text-xs" role="log" aria-live="polite">
        <p className="mb-1 flex items-center gap-1.5 text-muted-foreground">
          <Terminal className="size-3.5" /> Терминал
        </p>
        {!result && <p className="text-muted-foreground/60">{'$ Нажмите «Запустить код», чтобы увидеть результат'}</p>}
        {result?.output.map((l, i) => <p key={i} className="text-emerald-300">{l}</p>)}
        {result?.error && <p className="text-rose-400">{result.error}</p>}
        {result && !result.error && <p className="mt-1 text-muted-foreground/60">{'Process finished with exit code 0'}</p>}
      </div>
    </div>
  )
}
