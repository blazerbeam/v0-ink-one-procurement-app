"use client"

import { useState, useEffect } from "react"
import { Droppable, Draggable } from "@hello-pangea/dnd"
import { ChevronDown, ChevronRight, FileText, GripVertical, Mail, MoreHorizontal, Pencil, Plus, Trash2, UserCircle } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ItemStatusBadge } from "@/components/item-status-badge"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Item, ItemStatus, Package, Volunteer, STATUS_LABELS } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { AddItemDialog } from "./add-item-dialog"

interface DraggablePackageCardProps {
  pkg: Package
  items: Item[]
  allItems?: Item[] // All items in package before filtering
  volunteers: Volunteer[]
  packages: Package[] // All packages for the AddItemDialog
  eventId: string
  onUpdate: () => void
  onVolunteerAdded: () => void
  onItemClick?: (item: Item) => void
  onOutreachClick?: (item: Item) => void
  isDragOver?: boolean
  isDimmed?: boolean // Show package as dimmed when no matching items
  filterLabel?: string // e.g. "2 of 4 items at risk"
}

const statusOptions: ItemStatus[] = ["needed", "contacted", "confirmed", "received", "fulfilled", "declined"]

export function DraggablePackageCard({ 
  pkg, 
  items, 
  allItems,
  volunteers,
  packages,
  eventId,
  onUpdate,
  onVolunteerAdded,
  onItemClick,
  onOutreachClick,
  isDragOver = false,
  isDimmed = false,
  filterLabel,
}: DraggablePackageCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [editSheetOpen, setEditSheetOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: pkg.name || "",
    description: pkg.description || "",
    notes: pkg.notes || "",
  })

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const getVolunteerName = (ownerId: string | null) => {
    if (!ownerId) return null
    const volunteer = volunteers.find(v => v.id === ownerId)
    return volunteer ? `${volunteer.first_name} ${volunteer.last_name}` : null
  }

  // Use allItems for totals if provided, otherwise use filtered items
  const itemsForTotals = allItems || items
  const totalValue = itemsForTotals.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const securedItems = itemsForTotals.filter((item) =>
    ["confirmed", "received", "fulfilled"].includes(item.status)
  )

  const updateStatus = async (itemId: string, newStatus: ItemStatus) => {
    setUpdatingId(itemId)
    const supabase = createClient()
    await supabase.from("items").update({ status: newStatus }).eq("id", itemId)
    setUpdatingId(null)
    onUpdate()
  }

  const deleteItem = async (itemId: string) => {
    const supabase = createClient()
    await supabase.from("items").delete().eq("id", itemId)
    onUpdate()
  }

  const deletePackage = async () => {
    const supabase = createClient()
    await supabase.from("items").update({ package_id: null }).eq("package_id", pkg.id)
    await supabase.from("packages").delete().eq("id", pkg.id)
    onUpdate()
  }

  const handleEditPackage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("packages")
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        notes: formData.notes.trim() || null,
      })
      .eq("id", pkg.id)

    setIsSubmitting(false)

    if (!error) {
      setEditSheetOpen(false)
      onUpdate()
    }
  }

  const openEditSheet = () => {
    setFormData({
      name: pkg.name || "",
      description: pkg.description || "",
      notes: pkg.notes || "",
    })
    setEditSheetOpen(true)
  }

  // Don't render Droppable until mounted (SSR fix)
  if (!isMounted) {
    return (
      <Card>
        <CardHeader className="py-3">
          <div className="flex items-center gap-2">
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
            <span className="font-semibold">{pkg.name}</span>
            <span className="text-sm text-muted-foreground">
              ({items.length} {items.length === 1 ? "item" : "items"})
            </span>
          </div>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Droppable droppableId={`package-${pkg.id}`} type="ITEM">
      {(provided, snapshot) => (
        <Card 
          className={`transition-all duration-200 ${
            snapshot.isDraggingOver || isDragOver
              ? "ring-2 ring-primary border-primary bg-primary/5" 
              : ""
          } ${isDimmed ? "opacity-50" : ""}`}
        >
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CardHeader className="py-3">
              <div className="flex items-center justify-between">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 p-0 h-auto hover:bg-transparent">
                    {isOpen ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{pkg.name}</span>
                    <span className="text-sm text-muted-foreground">
                      ({itemsForTotals.length} {itemsForTotals.length === 1 ? "item" : "items"})
                    </span>
                    {filterLabel && (
                      <span className="text-xs font-medium text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                        {filterLabel}
                      </span>
                    )}
                  </Button>
                </CollapsibleTrigger>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {securedItems.length}/{itemsForTotals.length} secured
                  </span>
                  <span className="text-sm font-medium">
                    ${totalValue.toLocaleString()}
                  </span>
                  <AddItemDialog
                    eventId={eventId}
                    packages={packages}
                    volunteers={volunteers}
                    onItemAdded={onUpdate}
                    onVolunteerAdded={onVolunteerAdded}
                    defaultPackageId={pkg.id}
                    trigger={
                      <Button variant="ghost" size="sm" className="h-8 px-2">
                        <Plus className="h-4 w-4 mr-1" />
                        Add Item
                      </Button>
                    }
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Package actions</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={openEditSheet}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Package
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={deletePackage}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Package
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              {pkg.description && (
                <p className="text-sm text-muted-foreground mt-1 ml-6">{pkg.description}</p>
              )}
            </CardHeader>
            {/* Droppable area - always rendered for drag-drop to work */}
            <div 
              ref={provided.innerRef} 
              {...provided.droppableProps}
            >
              {isDimmed ? (
                /* When dimmed (no matching items), show subtle message */
                <div className="px-6 pb-3 pt-0">
                  <p className="text-xs text-muted-foreground italic border-t pt-2">No matching items</p>
                </div>
              ) : (
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div
                      className={`space-y-2 border-t pt-3 min-h-[60px] ${
                        items.length === 0 && !snapshot.isDraggingOver ? "flex items-center justify-center" : ""
                      }`}
                    >
                      {items.length === 0 && !snapshot.isDraggingOver ? (
                        <div className="text-sm text-muted-foreground py-2 text-center">
                          Drop items here
                        </div>
                      ) : (
                        items.map((item, index) => {
                          const ownerName = getVolunteerName(item.owner_id) || item.owner_name
                          return (
                            <Draggable key={item.id} draggableId={item.id} index={index}>
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  className={`flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors ${
                                    updatingId === item.id ? "opacity-50" : ""
                                  } ${dragSnapshot.isDragging ? "shadow-lg ring-2 ring-primary bg-background" : ""}`}
                                  onClick={() => onItemClick?.(item)}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <div
                                      {...dragProvided.dragHandleProps}
                                      className="cursor-grab active:cursor-grabbing p-1 -ml-1 hover:bg-muted rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="font-medium truncate">{item.name}</span>
                                        {item.notes && (
                                          <TooltipProvider>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                              </TooltipTrigger>
                                              <TooltipContent side="top" className="max-w-xs">
                                                <p className="text-sm">{item.notes}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </TooltipProvider>
                                        )}
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
                                        onClick={() => onOutreachClick?.(item)}
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
                        })
                      )}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              )}
              {provided.placeholder}
            </div>
          </Collapsible>

          {/* Edit Package Sheet */}
          <Sheet open={editSheetOpen} onOpenChange={setEditSheetOpen}>
            <SheetContent className="sm:max-w-md flex flex-col">
              <SheetHeader>
                <SheetTitle>Edit Package</SheetTitle>
                <SheetDescription>
                  Update the package name, description, and notes.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleEditPackage} className="flex-1 overflow-y-auto px-6 py-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor={`pkg-name-${pkg.id}`}>Package Name *</FieldLabel>
                    <Input
                      id={`pkg-name-${pkg.id}`}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`pkg-description-${pkg.id}`}>Description</FieldLabel>
                    <Textarea
                      id={`pkg-description-${pkg.id}`}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of what this package contains..."
                      rows={3}
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor={`pkg-notes-${pkg.id}`}>Notes</FieldLabel>
                    <Textarea
                      id={`pkg-notes-${pkg.id}`}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Any additional context or instructions..."
                      rows={3}
                    />
                  </Field>
                </FieldGroup>

                <SheetFooter className="flex-col gap-3 sm:flex-col">
                  <div className="flex gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setEditSheetOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="flex-1">
                      {isSubmitting ? <Spinner className="mr-2" /> : null}
                      Save Changes
                    </Button>
                  </div>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </Card>
      )}
    </Droppable>
  )
}
