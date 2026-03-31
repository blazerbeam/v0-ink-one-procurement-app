"use client"

import { Calendar, MapPin, Users, Target } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import type { Event } from "@/lib/types"

interface EventCardProps {
  event: Event
}

export function EventCard({ event }: EventCardProps) {
  const progress = event.total_items > 0 
    ? Math.round((event.items_secured / event.total_items) * 100) 
    : 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Date TBD"
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "$0"
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const statusColors = {
    upcoming: "bg-accent text-accent-foreground",
    active: "bg-primary text-primary-foreground",
    completed: "bg-muted text-muted-foreground",
  }

  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-lg">{event.event_name}</CardTitle>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {event.org_name}
            </p>
          </div>
          <Badge className={statusColors[event.status]} variant="secondary">
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {event.mission && (
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {event.mission}
          </p>
        )}
        
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span className="truncate">{formatDate(event.event_date)}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="truncate">{event.location}</span>
            </div>
          )}
          {event.guest_count && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              <span>{event.guest_count} guests</span>
            </div>
          )}
          {event.fundraising_goal && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Target className="h-4 w-4 shrink-0" />
              <span>{formatCurrency(event.fundraising_goal)}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Items Secured</span>
            <span className="font-medium">
              {event.items_secured} / {event.total_items}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
