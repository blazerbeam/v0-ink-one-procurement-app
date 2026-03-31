"use client"

import useSWR from "swr"
import { PartyPopper } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { EventCard } from "@/components/event-card"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import type { Event } from "@/lib/types"

const fetcher = async (): Promise<Event[]> => {
  const supabase = createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  return data as Event[]
}

export function Dashboard() {
  const { data: events, error, isLoading, mutate } = useSWR("events", fetcher)

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">
            Failed to load events. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Your Events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage procurement for your upcoming galas and fundraisers.
          </p>
        </div>
        <CreateEventDialog onEventCreated={() => mutate()} />
      </div>

      {isLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-lg border bg-card p-6">
              <div className="space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Empty>
          <EmptyMedia variant="icon">
            <PartyPopper className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No events yet</EmptyTitle>
          <EmptyDescription>
            Create your first event to start managing procurement for your gala.
          </EmptyDescription>
          <div className="mt-4">
            <CreateEventDialog onEventCreated={() => mutate()} />
          </div>
        </Empty>
      )}
    </div>
  )
}
