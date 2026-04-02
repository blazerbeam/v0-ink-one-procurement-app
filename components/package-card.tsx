"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, MoreHorizontal, Trash2, UserCircle } from "lucide-react"
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
import { Item, ItemStatus, Package, Volunteer, STATUS_LABELS } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface PackageCardProps {
  pkg: Package
  items: Item[]
  volunteers: Volunteer[]
  onUpdate: () => void
  onItemClick?: (item: Item) => void
}

const statusOptions: ItemStatus[] = ["needed", "contacted", "confirmed", "received", "fulfilled", "declined"]

export function PackageCard({ pkg, items, volunteers, onUpdate, onItemClick }: PackageCardProps) {
  const [isOpen, setIsOpen] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const getVolunteerName = (ownerId: string | null) => {
    if (!ownerId) return null
    const volunteer = volunteers.find(v => v.id === ownerId)
    return volunteer ? `${volunteer.first_name} ${volunteer.last_name}` : null
  }

  const totalValue = items.reduce((sum, item) => sum + (item.estimated_value || 0), 0)
  const securedItems = items.filter((item) =>
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
    // First unassign items from this package
    await supabase.from("items").update({ package_id: null }).eq("package_id", pkg.id)
    // Then delete the package
    await supabase.from("packages").delete().eq("id", pkg.id)
    onUpdate()
  }

  return (
    <Card>
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
                  ({items.length} {items.length === 1 ? "item" : "items"})
                </span>
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {securedItems.length}/{items.length} secured
              </span>
              <span className="text-sm font-medium">
                ${totalValue.toLocaleString()}
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Package actions</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
        <CollapsibleContent>
          <CardContent className="pt-0">
            {items.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4 text-center border-t">
                No items in this package yet
              </div>
            ) : (
              <div className="space-y-2 border-t pt-3">
                {items.map((item) => {
                  const ownerName = getVolunteerName(item.owner_id) || item.owner_name
                  return (
                    <div
                      key={item.id}
                      onClick={() => onItemClick?.(item)}
                      className={`flex items-center justify-between py-2 px-3 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors ${
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
                          {ownerName && (
                            <span className="flex items-center gap-1">
                              <UserCircle className="h-3 w-3" />
                              {ownerName}
                            </span>
                          )}
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
                        <DropdownMenuContent align="end">
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
                  )
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
