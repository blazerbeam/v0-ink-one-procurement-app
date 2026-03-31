import { Badge } from "@/components/ui/badge"
import { ItemStatus } from "@/lib/types"

const statusConfig: Record<ItemStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  expected: { label: "Expected", variant: "outline" },
  confirmed: { label: "Confirmed", variant: "secondary" },
  received: { label: "Received", variant: "default" },
  missing: { label: "Missing", variant: "destructive" },
  fulfilled: { label: "Fulfilled", variant: "default" },
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className={status === "fulfilled" ? "bg-primary" : ""}>
      {config.label}
    </Badge>
  )
}
