import { Badge } from "@/components/ui/badge"
import { ItemStatus, STATUS_LABELS } from "@/lib/types"

const statusConfig: Record<ItemStatus, { variant: "default" | "secondary" | "destructive" | "outline" }> = {
  expected: { variant: "outline" },
  confirmed: { variant: "secondary" },
  received: { variant: "default" },
  missing: { variant: "destructive" },
  fulfilled: { variant: "default" },
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={status === "fulfilled" ? "bg-primary" : ""}>
      {STATUS_LABELS[status]}
    </Badge>
  )
}
