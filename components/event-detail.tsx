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
import { AddItemDialog } from "@/components/add-item-dialog"
import { AddPackageDialog } from "@/components/add-package-dialog"
import { PackageCard } from "@/components/package-card"
import { ItemStatusBadge } from "@/components/item-status-badge"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  ChevronDown,
  DollarSign,
  MapPin,
  MoreHorizontal,
  Package as PackageIcon,
  Trash2,
  Users,
} from "lucide-react"
import { useState } from "react"
import { ItemStatus } from "@/lib/types"

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

const statusOptions: { value: ItemStatus; label: string }[] = [
  { value: "expected", label: "Expected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "received", label: "Received" },
  { value: "missing", label: "Missing" },
  { value: "fulfilled", label: "Fulfilled" },
]

export function EventDetail({ eventId }: EventDetailProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  
  const { data, isLoading, mutate } = useSWR(
    `event-${eventId}`,
    () => fetchEventData(eventId)
  )

  const event = data?.event
  const packages = data?.packages || []
  const items = data?.items || []

  // Computed values
  const totalValue = items.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const securedItems = items.filter((item) => ["confirmed", "received", "fulfilled"].includes(item.status))
  const securedValue = securedItems.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const progress = items.length > 0 ? (securedItems.length / items.length) * 100 : 0

  // Items by category
  const unassignedItems = items.filter((item) => !item.package_id)
  const atRiskItems = items.filter((item) => item.status === "expected")

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    })
  }

  const updateStatus = async (itemId: string, newStatus: ItemStatus) => {
    setUpdatingId(itemId)
    const supabase = createClient()
    await supabase.from("items").update({ status: newStatus }).eq("id", itemId)
    setUpdatingId(null)
    mutate()
  }

  const deleteItem = async (itemId: string) => {
    const supabase = createClient()
    await supabase.from("items").delete().eq("id", itemId)
    mutate()
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

  const ItemRow = ({ item }: { item: Item }) => (
    <div
      className={`flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 ${
        updatingId === item.id ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{item.name}</span>
          <ItemStatusBadge status={item.status} />
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {item.donor_name && <span>{item.donor_name}</span>}
          {item.estimated_value && (
            <span className="font-medium text-foreground">
              ${item.estimated_value.toLocaleString()}
            </span>
          )}
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">Item actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {statusOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => updateStatus(item.id, option.value)}
              disabled={item.status === option.value}
            >
              Mark as {option.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => deleteItem(item.id)}
            className="text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )

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
                {event.mission && (
                  <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="link" className="h-auto p-0 text-sm text-muted-foreground hover:text-foreground">
                        {detailsOpen ? "Hide details" : "Show mission & details"}
                        <ChevronDown className={`ml-1 h-3 w-3 transition-transform ${detailsOpen ? "rotate-180" : ""}`} />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2">
                      <p className="text-sm text-muted-foreground max-w-2xl">{event.mission}</p>
                    </CollapsibleContent>
                  </Collapsible>
                )}
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

          {/* Two-column layout */}
          <div className="grid gap-6 lg:grid-cols-[65%_35%]">
            {/* Left column - Packages */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Packages</h2>
                <AddPackageDialog eventId={eventId} onPackageAdded={() => mutate()} />
              </div>
              
              {packages.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <Empty>
                      <EmptyMedia variant="icon">
                        <PackageIcon className="h-6 w-6" />
                      </EmptyMedia>
                      <EmptyTitle>No packages yet</EmptyTitle>
                      <EmptyDescription>
                        Add your first package to start organizing items
                      </EmptyDescription>
                    </Empty>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg) => {
                    const pkgItems = items.filter((item) => item.package_id === pkg.id)
                    return (
                      <PackageCard
                        key={pkg.id}
                        pkg={pkg}
                        items={pkgItems}
                        onUpdate={() => mutate()}
                      />
                    )
                  })}
                </div>
              )}
            </div>

            {/* Right column - Unassigned Items & At Risk */}
            <div className="space-y-4">
              {/* Unassigned Items */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Unassigned Items</CardTitle>
                    <AddItemDialog eventId={eventId} packages={packages} onItemAdded={() => mutate()} />
                  </div>
                </CardHeader>
                <CardContent>
                  {unassignedItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No unassigned items
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {unassignedItems.map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* At Risk Items */}
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-4 w-4" />
                    At Risk
                  </CardTitle>
                  <CardDescription>
                    Items with &quot;expected&quot; status that need follow-up
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {atRiskItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items at risk
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {atRiskItems.map((item) => (
                        <ItemRow key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
