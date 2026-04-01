import { Badge } from "@/components/ui/badge"
import { ItemStatus, STATUS_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusStyles: Record<ItemStatus, string> = {
  expected: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
  contacted: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100",
  confirmed: "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-100",
  received: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
  missing: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
  fulfilled: "bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100",
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  return (
    <Badge variant="outline" className={cn(statusStyles[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
