"use client"

import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ItemStatusBadge } from "@/components/item-status-badge"
import { Item, ItemStatus, Package, STATUS_LABELS } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"
import { MoreHorizontal, Trash2 } from "lucide-react"

interface ItemsTableProps {
  items: Item[]
  packages: Package[]
  onUpdate: () => void
}

const statusOptions: ItemStatus[] = ["desired", "contacted", "confirmed", "received", "fulfilled", "declined"]

export function ItemsTable({ items, packages, onUpdate }: ItemsTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const getPackageName = (packageId: string | null) => {
    if (!packageId) return "—"
    const pkg = packages.find((p) => p.id === packageId)
    return pkg?.name || "—"
  }

  const formatValue = (value: number | null) => {
    if (value === null) return "—"
    return `$${value.toLocaleString()}`
  }

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

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No items yet. Add your first item to get started.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[250px]">Item</TableHead>
            <TableHead>Donor</TableHead>
            <TableHead>Package</TableHead>
            <TableHead className="text-right">Value</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id} className={updatingId === item.id ? "opacity-50" : ""}>
              <TableCell>
                <div>
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {item.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>{item.donor_name || "—"}</TableCell>
              <TableCell>{getPackageName(item.package_id)}</TableCell>
              <TableCell className="text-right font-medium">
                {formatValue(item.estimated_value)}
              </TableCell>
              <TableCell>
                <ItemStatusBadge status={item.status} />
              </TableCell>
              <TableCell>{item.owner_name || "—"}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
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
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
