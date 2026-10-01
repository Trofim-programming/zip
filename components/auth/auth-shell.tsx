import { Logo } from '@/components/kit'

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden border-r bg-card lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="grid-bg absolute inset-0 [mask-image:radial-gradient(circle_at_30%_40%,black,transparent_70%)]" />
        <div className="absolute -left-20 top-1/3 size-96 rounded-full bg-primary/25 blur-[100px]" />
        <div className="absolute bottom-0 right-0 size-72 rounded-full bg-cyan/15 blur-[100px]" />
        <Logo className="relative" />
        <div className="relative">
          <pre className="glass mb-8 max-w-sm rounded-xl p-4 font-mono text-sm leading-relaxed">
            <span className="text-violet-400">def</span> <span className="text-cyan">learn</span>(you):{'\n'}
            {'    '}
            <span className="text-violet-400">while</span> you.curious:{'\n'}
            {'        '}you.skills += <span className="text-emerald-300">1</span>
          </pre>
          <p className="max-w-md text-balance text-3xl font-semibold leading-tight">
            {'Присоединяйтесь к 48 000 ученикам, которые пишут код каждый день.'}
          </p>
        </div>
        <p className="relative text-sm text-muted-foreground">{'© 2026 CODELAB'}</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <Logo className="mb-10 lg:hidden" />
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mb-8 mt-1 text-muted-foreground">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, id, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; id: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="h-11 w-full rounded-xl border bg-secondary px-3.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-3 focus:ring-primary/20"
        {...props}
      />
    </div>
  )
}

export function GoogleButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border bg-secondary text-sm font-medium transition-colors hover:bg-accent"
    >
      <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.8-5.5 3.8-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.2 14.6 2.2 12 2.2 6.6 2.2 2.2 6.6 2.2 12s4.4 9.8 9.8 9.8c5.7 0 9.4-4 9.4-9.6 0-.6-.1-1.1-.2-1.6H12z" />
      </svg>
      Продолжить с Google
    </button>
  )
}
