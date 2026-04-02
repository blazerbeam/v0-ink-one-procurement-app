"use client"

import useSWR from "swr"
import Link from "next/link"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import { createClient } from "@/lib/supabase/client"
import { Event, Item, Package, Volunteer, ItemStatus, STATUS_LABELS } from "@/lib/types"
import { Header } from "@/components/header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { AddItemDialog } from "@/components/add-item-dialog"
import { AddPackageDialog } from "@/components/add-package-dialog"
import { AddVolunteerDialog } from "@/components/add-volunteer-dialog"
import { EditItemSheet } from "@/components/edit-item-sheet"
import { OutreachEmailSheet } from "@/components/outreach-email-sheet"
import { DraggablePackageCard } from "@/components/draggable-package-card"
import { ItemStatusBadge } from "@/components/item-status-badge"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  GripVertical,
  Mail,
  MapPin,
  MoreHorizontal,
  Package as PackageIcon,
  Phone,
  Trash2,
  UserCircle,
  Users,
  X,
  Check,
} from "lucide-react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react"

interface EventDetailProps {
  eventId: string
}

async function fetchEventData(eventId: string) {
  const supabase = createClient()
  
  const [eventResult, packagesResult, itemsResult, volunteersResult] = await Promise.all([
    supabase.from("events").select("*").eq("id", eventId).single(),
    supabase.from("packages").select("*").eq("event_id", eventId).order("created_at", { ascending: true }),
    supabase.from("items").select("*").eq("event_id", eventId).order("created_at", { ascending: false }),
    supabase.from("volunteers").select("*").eq("event_id", eventId).order("first_name", { ascending: true }),
  ])

  return {
    event: eventResult.data as Event | null,
    packages: (packagesResult.data || []) as Package[],
    items: (itemsResult.data || []) as Item[],
    volunteers: (volunteersResult.data || []) as Volunteer[],
  }
}

const statusOptions: ItemStatus[] = ["expected", "contacted", "confirmed", "received", "missing", "fulfilled"]

export function EventDetail({ eventId }: EventDetailProps) {
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [editingItem, setEditingItem] = useState<Item | null>(null)
  const [outreachItem, setOutreachItem] = useState<Item | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  
  // Filter state
  type StatusFilter = "all" | "at-risk" | "unassigned" | "received" | "contacted"
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all")
  const [statCardFilter, setStatCardFilter] = useState<"at-risk" | "progress" | null>(null)

  // Fix for @hello-pangea/dnd SSR hydration
  useEffect(() => {
    setIsMounted(true)
  }, [])
  
  const { data, isLoading, mutate } = useSWR(
    `event-${eventId}`,
    () => fetchEventData(eventId)
  )

  const event = data?.event
  const packages = data?.packages || []
  const items = data?.items || []
  const volunteers = data?.volunteers || []

  // Computed values
  const totalValue = items.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const securedItems = items.filter((item) => ["confirmed", "received", "fulfilled"].includes(item.status))
  const securedValue = securedItems.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const progress = items.length > 0 ? (securedItems.length / items.length) * 100 : 0

  // Items by category
  const unassignedItems = items.filter((item) => !item.package_id)
  const atRiskItems = items.filter((item) => item.status === "expected" || item.status === "missing")

  // Get volunteer name by id - must be defined before filterItem uses it
  const getVolunteerName = (ownerId: string | null): string | null => {
    if (!ownerId) return null
    const volunteer = volunteers.find(v => v.id === ownerId)
    return volunteer ? `${volunteer.first_name} ${volunteer.last_name}` : null
  }

  // Filter logic
  const filterItem = (item: Item): boolean => {
    // Stat card filter takes precedence
    if (statCardFilter === "at-risk") {
      if (item.status !== "expected" && item.status !== "missing") return false
    } else if (statCardFilter === "progress") {
      if (item.status !== "confirmed" && item.status !== "received") return false
    }
    
    // Status filter
    if (statusFilter === "at-risk" && item.status !== "expected" && item.status !== "missing") return false
    if (statusFilter === "unassigned" && item.package_id) return false
    if (statusFilter === "received" && item.status !== "received") return false
    if (statusFilter === "contacted" && item.status !== "contacted") return false
    
    // Assignee filter
    if (assigneeFilter !== "all") {
      const selectedVolunteer = volunteers.find(v => v.id === assigneeFilter)
      if (selectedVolunteer) {
        // Check if item.owner_id matches directly
        if (item.owner_id === assigneeFilter) {
          // Direct match via owner_id
        } else if (item.owner_name) {
          // Fallback: check if owner_name text matches the volunteer name
          const volFullName = `${selectedVolunteer.first_name} ${selectedVolunteer.last_name}`.toLowerCase()
          const volFirstName = selectedVolunteer.first_name.toLowerCase()
          const ownerNameLower = item.owner_name.toLowerCase()
          if (ownerNameLower !== volFullName && ownerNameLower !== volFirstName) {
            return false
          }
        } else {
          // No owner_id match and no owner_name - doesn't match this assignee
          return false
        }
      }
    }
    
    return true
  }

  const filteredItems = items.filter(filterItem)
  const isFiltered = statusFilter !== "all" || assigneeFilter !== "all" || statCardFilter !== null

  const clearAllFilters = () => {
    setStatusFilter("all")
    setAssigneeFilter("all")
    setStatCardFilter(null)
  }

  const toggleStatCardFilter = (filter: "at-risk" | "progress") => {
    if (statCardFilter === filter) {
      setStatCardFilter(null)
    } else {
      setStatCardFilter(filter)
      // Clear the status filter when using stat card filter
      setStatusFilter("all")
    }
  }

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

  const deleteVolunteer = async (volunteerId: string) => {
    const supabase = createClient()
    await supabase.from("volunteers").delete().eq("id", volunteerId)
    mutate()
  }

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    // Dropped outside any droppable
    if (!destination) return

    // Dropped in same position
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) return

    // Extract the target package ID from droppableId
    // Format is "package-{uuid}" or "unassigned"
    let newPackageId: string | null = null
    if (destination.droppableId.startsWith("package-")) {
      newPackageId = destination.droppableId.replace("package-", "")
    }

    // Update the item's package_id in the database
    const supabase = createClient()
    await supabase
      .from("items")
      .update({ package_id: newPackageId })
      .eq("id", draggableId)

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

  const DraggableItemRow = ({ item, index }: { item: Item; index: number }) => {
    const ownerName = getVolunteerName(item.owner_id) || item.owner_name
    return (
      <Draggable draggableId={item.id} index={index}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            onClick={() => setEditingItem(item)}
            className={`flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors ${
              updatingId === item.id ? "opacity-50" : ""
            } ${snapshot.isDragging ? "shadow-lg ring-2 ring-primary bg-background" : ""}`}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div
                {...provided.dragHandleProps}
                className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
                onClick={(e) => e.stopPropagation()}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </div>
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
                  {ownerName && (
                    <span className="flex items-center gap-1">
                      <UserCircle className="h-3 w-3" />
                      {ownerName}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Item actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem
                  onClick={() => setOutreachItem(item)}
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Generate Outreach Email
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {statusOptions.map((status) => (
                  <DropdownMenuItem
                    key={status}
                    onClick={() => updateStatus(item.id, status)}
                    disabled={item.status === status}
                  >
                    Mark as {STATUS_LABELS[status]}
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
        )}
      </Draggable>
    )
  }

  const VolunteersTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Volunteers ({volunteers.length})</h2>
        <AddVolunteerDialog eventId={eventId} onVolunteerAdded={() => mutate()} />
      </div>
      
      {volunteers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Users className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No volunteers yet</EmptyTitle>
              <EmptyDescription>
                Add volunteers to assign them as item owners
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {volunteers.map((volunteer) => {
            const assignedItems = items.filter(item => item.owner_id === volunteer.id)
            return (
              <Card key={volunteer.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {volunteer.first_name} {volunteer.last_name}
                      </CardTitle>
                      <CardDescription>
                        {assignedItems.length} item{assignedItems.length !== 1 ? 's' : ''} assigned
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => deleteVolunteer(volunteer.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Volunteer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-1">
                  {volunteer.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5" />
                      <a href={`mailto:${volunteer.email}`} className="hover:text-foreground">
                        {volunteer.email}
                      </a>
                    </div>
                  )}
                  {volunteer.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5" />
                      <a href={`tel:${volunteer.phone}`} className="hover:text-foreground">
                        {volunteer.phone}
                      </a>
                    </div>
                  )}
                  {volunteer.notes && (
                    <p className="text-xs pt-1 italic">{volunteer.notes}</p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  const ItemsTab = () => {
    // Don't render DragDropContext until mounted (SSR fix)
    if (!isMounted) {
      return (
        <div className="grid gap-6 lg:grid-cols-[65%_35%]">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Packages</h2>
            </div>
            <Skeleton className="h-[200px]" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[200px]" />
            <Skeleton className="h-[150px]" />
          </div>
        </div>
      )
    }

    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex flex-col-reverse gap-6 lg:flex-row lg:gap-6">
        {/* Packages column - shown second on mobile (flex-col-reverse) */}
        <div className="space-y-4 lg:flex-[65%]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Packages</h2>
            <AddPackageDialog eventId={eventId} onPackageAdded={() => mutate()} />
          </div>
          
          {statusFilter === "unassigned" ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <Empty>
                  <EmptyMedia variant="icon">
                    <PackageIcon className="h-6 w-6" />
                  </EmptyMedia>
                  <EmptyTitle>Showing unassigned items only</EmptyTitle>
                  <EmptyDescription>
                    <span className="lg:hidden">
                      All {unassignedItems.length} unassigned item{unassignedItems.length !== 1 ? 's are' : ' is'} shown above.
                    </span>
                    <span className="hidden lg:inline">
                      All {unassignedItems.length} unassigned item{unassignedItems.length !== 1 ? 's are' : ' is'} in the right column.
                    </span>
                    <br />
                    <Button 
                      variant="link" 
                      className="h-auto p-0 mt-2"
                      onClick={() => setStatusFilter("all")}
                    >
                      Clear filter to see packages
                    </Button>
                  </EmptyDescription>
                </Empty>
              </CardContent>
            </Card>
          ) : packages.length === 0 ? (
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
                const filteredPkgItems = pkgItems.filter(filterItem)
                
                // Build filter label for context
                let filterLabel: string | undefined
                const isDimmed = isFiltered && filteredPkgItems.length === 0
                
                if (isFiltered && pkgItems.length > 0) {
                  if (statCardFilter === "at-risk" || statusFilter === "at-risk") {
                    const atRiskCount = pkgItems.filter(i => i.status === "expected" || i.status === "missing").length
                    if (atRiskCount > 0) {
                      filterLabel = `${atRiskCount} of ${pkgItems.length} at risk`
                    }
                  } else if (assigneeFilter !== "all") {
                    if (filteredPkgItems.length > 0) {
                      filterLabel = `${filteredPkgItems.length} of ${pkgItems.length} items`
                    }
                  }
                }
                
                return (
                  <DraggablePackageCard
                    key={pkg.id}
                    pkg={pkg}
                    items={filteredPkgItems}
                    allItems={pkgItems}
                    volunteers={volunteers}
                    onUpdate={() => mutate()}
                    onItemClick={(item) => setEditingItem(item)}
                    onOutreachClick={(item) => setOutreachItem(item)}
                    isDimmed={isDimmed}
                    filterLabel={filterLabel}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Unassigned column - shown first on mobile */}
        <div className="space-y-4 lg:flex-[35%]">
          {/* Unassigned Items */}
          <Droppable droppableId="unassigned" type="ITEM">
            {(provided, snapshot) => (
              <Card className={`transition-all duration-200 ${
                snapshot.isDraggingOver ? "ring-2 ring-primary border-primary bg-primary/5" : ""
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Unassigned Items</CardTitle>
                    <AddItemDialog 
                      eventId={eventId} 
                      packages={packages} 
                      volunteers={volunteers}
                      onItemAdded={() => mutate()} 
                      onVolunteerAdded={() => mutate()}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="min-h-[60px]"
                  >
                    {(() => {
                      const filteredUnassigned = unassignedItems.filter(filterItem)
                      if (filteredUnassigned.length === 0 && !snapshot.isDraggingOver) {
                        return (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            {isFiltered ? "No matching items" : "No unassigned items"}
                          </p>
                        )
                      }
                      return (
                        <div className="space-y-2">
                          {filteredUnassigned.map((item, index) => (
                            <DraggableItemRow key={item.id} item={item} index={index} />
                          ))}
                        </div>
                      )
                    })()}
                    {provided.placeholder}
                  </div>
                </CardContent>
              </Card>
            )}
          </Droppable>

          {/* At Risk Items - Read only, not droppable */}
          <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                At Risk
              </CardTitle>
              <CardDescription>
                Expected items that need follow-up
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const filteredAtRisk = atRiskItems.filter(filterItem)
                if (filteredAtRisk.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {isFiltered ? "No matching items" : "No items at risk"}
                    </p>
                  )
                }
                return (
                  <div className="space-y-2">
                    {filteredAtRisk.map((item) => {
                      const ownerName = getVolunteerName(item.owner_id) || item.owner_name
                      return (
                        <div
                          key={item.id}
                          onClick={() => setEditingItem(item)}
                          className="flex items-center justify-between py-2 px-3 rounded-md bg-amber-100/50 dark:bg-amber-950/30 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
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
                              {ownerName && (
                                <span className="flex items-center gap-1">
                                  <UserCircle className="h-3 w-3" />
                                  {ownerName}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        </div>
        </div>
      </DragDropContext>
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

          {/* Stats cards - horizontal scroll on mobile */}
          <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0 md:grid md:grid-cols-4 md:overflow-visible snap-x snap-mandatory -mx-4 px-4 md:mx-0 md:px-0">
            <Card 
              className={`min-w-[180px] md:min-w-0 snap-start cursor-pointer transition-all hover:bg-muted/50 ${
                statCardFilter === "progress" ? "ring-2 ring-green-500 border-green-500" : ""
              }`}
              onClick={() => toggleStatCardFilter("progress")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PackageIcon className="h-4 w-4" />
                    Items Progress
                  </span>
                  {statCardFilter === "progress" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <X className="h-3 w-3" /> Clear
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {securedItems.length} / {items.length}
                </div>
                <Progress value={progress} className="mt-2 h-2" />
              </CardContent>
            </Card>
            <Card className="min-w-[180px] md:min-w-0 snap-start">
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
            <Card 
              className={`min-w-[180px] md:min-w-0 snap-start cursor-pointer transition-all hover:bg-muted/50 ${
                statCardFilter === "at-risk" ? "ring-2 ring-green-500 border-green-500" : ""
              }`}
              onClick={() => toggleStatCardFilter("at-risk")}
            >
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    At Risk
                  </span>
                  {statCardFilter === "at-risk" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <X className="h-3 w-3" /> Clear
                    </span>
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">
                  {atRiskItems.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  items need follow-up
                </p>
              </CardContent>
            </Card>
            <Card className="min-w-[180px] md:min-w-0 snap-start">
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
                {event.location && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {event.location}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 px-4 bg-muted/30 rounded-lg border">
            {/* Status filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground mr-1">Status:</span>
              {(["all", "at-risk", "unassigned", "received", "contacted"] as const).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter && !statCardFilter ? "default" : "outline"}
                  size="sm"
                  className={`h-7 text-xs ${statusFilter === filter && !statCardFilter ? "bg-primary" : ""}`}
                  onClick={() => {
                    setStatusFilter(filter)
                    setStatCardFilter(null)
                  }}
                >
                  {filter === "all" && "All"}
                  {filter === "at-risk" && "At Risk"}
                  {filter === "unassigned" && "Unassigned"}
                  {filter === "received" && "Received"}
                  {filter === "contacted" && "Contacted"}
                </Button>
              ))}
            </div>

            {/* Assignee dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Assignee:</span>
              <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                <SelectTrigger className="w-[180px] h-8">
                  <SelectValue placeholder="All Assignees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Assignees</SelectItem>
                  {volunteers.map((volunteer) => (
                    <SelectItem key={volunteer.id} value={volunteer.id}>
                      {volunteer.first_name} {volunteer.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Active filter indicator */}
          {isFiltered && (
            <div className="flex items-center justify-between py-2 px-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-green-700 dark:text-green-400">
                  Filtered: 
                  {statCardFilter === "at-risk" && " At Risk"}
                  {statCardFilter === "progress" && " In Progress"}
                  {statusFilter !== "all" && !statCardFilter && ` ${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1).replace("-", " ")}`}
                  {assigneeFilter !== "all" && (() => {
                    const vol = volunteers.find(v => v.id === assigneeFilter)
                    return vol ? ` · ${vol.first_name} ${vol.last_name}` : ""
                  })()}
                  {" · "}Showing {filteredItems.length} of {items.length} items
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-100"
                onClick={clearAllFilters}
              >
                <X className="h-3 w-3 mr-1" />
                Clear all filters
              </Button>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="items" className="space-y-4">
            <TabsList>
              <TabsTrigger value="items">Items & Packages</TabsTrigger>
              <TabsTrigger value="volunteers">Volunteers ({volunteers.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="items">
              <ItemsTab />
            </TabsContent>
            <TabsContent value="volunteers">
              <VolunteersTab />
            </TabsContent>
          </Tabs>
        </div>

        {/* Edit Item Sheet */}
        <EditItemSheet
          item={editingItem}
          packages={packages}
          volunteers={volunteers}
          open={!!editingItem}
          onOpenChange={(open) => !open && setEditingItem(null)}
          onUpdate={() => mutate()}
        />

        {/* Outreach Email Sheet */}
        <OutreachEmailSheet
          item={outreachItem}
          event={event}
          volunteers={volunteers}
          open={!!outreachItem}
          onOpenChange={(open) => !open && setOutreachItem(null)}
          onUpdate={() => mutate()}
        />
      </main>
    </div>
  )
}
