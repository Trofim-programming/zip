import { Pricing } from '@/components/landing/pricing'

export default function PricingPage() {
  return (
    <div className="-mx-4 -mt-6 overflow-hidden rounded-2xl md:mx-0 md:mt-0 [&_section]:border-t-0 [&_section]:bg-transparent [&_section>div]:py-4">
      <h1 className="sr-only">Тарифы</h1>
      <Pricing />
    </div>
  )
}
