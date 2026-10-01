import { AppSidebar, MobileNav } from '@/components/shell/app-sidebar'
import { AiTutor } from '@/components/shell/ai-tutor'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav />
        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 pb-28 pt-6 md:px-8 lg:pb-10 lg:pt-8">{children}</main>
      </div>
      <AiTutor />
    </div>
  )
}
