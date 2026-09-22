import { createFileRoute } from '@tanstack/react-router'
import { Plane } from 'lucide-react'

export const Route = createFileRoute('/admin/travel')({
  component: TravelTab,
})

// Placeholder — the data model (flight routes vs. hotel listings, pricing,
// dates, availability, etc.) hasn't been decided yet, so this is just the
// section landing in the sidebar until that's scoped out.
function TravelTab() {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-20 text-center">
      <Plane className="h-8 w-8 text-muted-foreground" />
      <h2 className="mt-4 text-xl">Flights & Hotels</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        This section is reserved for managing flight and hotel deals. Nothing
        is wired up yet — tell me what fields and behavior you want (routes,
        hotel listings, pricing, dates, etc.) and this becomes a real CRUD
        section like Deals or Sales.
      </p>
    </div>
  )
}
