"use client"

import { use } from "react"
import { EventDetail } from "@/components/event-detail"

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <EventDetail eventId={id} />
}
