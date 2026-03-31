"use client"

import useSWR from "swr"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Event, Item, Package } from "@/lib/types"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddItemDialog } from "@/components/add-item-dialog"
import { AddPackageDialog } from "@/components/add-package-dialog"
import { ItemsTable } from "@/components/items-table"
import { ArrowLeft, Calendar, DollarSign, MapPin, Package as PackageIcon, Users } from "lucide-react"

interface EventDetailProps {
  eventId: string
}

async function fetchEventData(eventId: string) {
  const supabase = createClient()
  
  const [eventResult, packagesResult, itemsResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("packages").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    supabase.from("items").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
  ])

  return {
    event: eventResult.data as Event | null,
    packages: (packagesResult.data || []) as Package[],
    items: (itemsResult.data || []) as Item[],
  }
}

export function EventDetail({ eventId }: EventDetailProps) {
  const { data, isLoading, mutate } = useSWR(
    `event-${eventId}`,
    () => fetchEventData(eventId)
  )

  const event = data?.event
  const packages = data?.packages || []
  const items = data?.items || []

  const totalValue = items.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const securedItems = items.filter((item) => ["confirmed", "received", "fulfilled"].includes(item.status))
  const securedValue = securedItems.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const progress = items.length > 0 ? (securedItems.length / items.length) * 100 : 0

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-8 w-48" />
            <div className="grid gap-4 md:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-28" />
              ))}
            </div>
            <Skeleton className="h-[400px]" />
          </div>
        </main>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold mb-2">Event not found</h2>
            <p className="text-muted-foreground mb-4">
              This event may have been deleted or the link is invalid.
            </p>
            <Button asChild>
              <Link href="/">Go to Dashboard</Link>
            </Button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Back link and title */}
          <div>
            <Button variant="ghost" size="sm" asChild className="mb-2 -ml-2">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Events
              </Link>
            </Button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{event.event_name}</h1>
                <p className="text-muted-foreground">{event.org_name}</p>
              </div>
            </div>
          </div>

          {/* Stats cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <PackageIcon className="h-4 w-4" />
                  Items Progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {securedItems.length} / {items.length}
                </div>
                <Progress value={progress} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Secured Value
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${securedValue.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  of ${totalValue.toLocaleString()} total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Event Date
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold">
                  {formatDate(event.event_date) || "Not set"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Expected Guests
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {event.guest_count?.toLocaleString() || "—"}
                </div>
                {event.location && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Mission statement */}
          {event.mission && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{event.mission}</p>
              </CardContent>
            </Card>
          )}

          {/* Items tabs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Procurement Items</CardTitle>
                <div className="flex gap-2">
                  <AddPackageDialog eventId={eventId} onPackageAdded={() => mutate()} />
                  <AddItemDialog eventId={eventId} packages={packages} onItemAdded={() => mutate()} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Items ({items.length})</TabsTrigger>
                  {packages.map((pkg) => {
                    const pkgItems = items.filter((item) => item.package_id === pkg.id)
                    return (
                      <TabsTrigger key={pkg.id} value={pkg.id}>
                        {pkg.name} ({pkgItems.length})
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
                <TabsContent value="all">
                  <ItemsTable items={items} packages={packages} onUpdate={() => mutate()} />
                </TabsContent>
                {packages.map((pkg) => {
                  const pkgItems = items.filter((item) => item.package_id === pkg.id)
                  return (
                    <TabsContent key={pkg.id} value={pkg.id}>
                      <ItemsTable items={pkgItems} packages={packages} onUpdate={() => mutate()} />
                    </TabsContent>
                  )
                })}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
