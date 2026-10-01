import { SiteHeader } from '@/components/landing/site-header'
import { Hero } from '@/components/landing/hero'
import { Sections } from '@/components/landing/sections'
import { Pricing } from '@/components/landing/pricing'
import { Faq } from '@/components/landing/faq'
import { Logo } from '@/components/kit'

export default function HomePage() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <SiteHeader />
      <main>
        <Hero />
        <Sections />
        <Pricing />
        <Faq />
      </main>
      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
          <Logo />
          <p>{'© 2026 CODELAB. Учись писать код, который работает.'}</p>
        </div>
      </footer>
    </div>
  )
}
