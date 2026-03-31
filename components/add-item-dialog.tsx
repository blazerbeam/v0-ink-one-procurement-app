"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ItemFormData, ItemStatus, Package } from "@/lib/types"

interface AddItemDialogProps {
  eventId: string
  packages: Package[]
  onItemAdded: () => void
}

const statusOptions: { value: ItemStatus; label: string }[] = [
  { value: "expected", label: "Expected" },
  { value: "confirmed", label: "Confirmed" },
  { value: "received", label: "Received" },
  { value: "missing", label: "Missing" },
  { value: "fulfilled", label: "Fulfilled" },
]

export function AddItemDialog({ eventId, packages, onItemAdded }: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    description: "",
    donor_name: "",
    estimated_value: "",
    status: "expected",
    owner_name: "",
    package_id: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from("items").insert({
      event_id: eventId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      donor_name: formData.donor_name.trim() || null,
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      status: formData.status,
      owner_name: formData.owner_name.trim() || null,
      package_id: formData.package_id || null,
    })

    setIsSubmitting(false)

    if (!error) {
      setFormData({
        name: "",
        description: "",
        donor_name: "",
        estimated_value: "",
        status: "expected",
        owner_name: "",
        package_id: "",
      })
      setOpen(false)
      onItemAdded()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Item
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Item</DialogTitle>
            <DialogDescription>
              Add a new item to track for this event.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="name">Item Name *</FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weekend Getaway Package"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the item"
                rows={2}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="donor_name">Donor Name</FieldLabel>
                <Input
                  id="donor_name"
                  value={formData.donor_name}
                  onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
                  placeholder="e.g., Local Hotel"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="estimated_value">Estimated Value ($)</FieldLabel>
                <Input
                  id="estimated_value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.estimated_value}
                  onChange={(e) => setFormData({ ...formData, estimated_value: e.target.value })}
                  placeholder="0.00"
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="status">Status</FieldLabel>
                <Select
                  value={formData.status}
                  onValueChange={(value: ItemStatus) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="owner_name">Owner/Assignee</FieldLabel>
                <Input
                  id="owner_name"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  placeholder="Who is responsible?"
                />
              </Field>
            </div>
            {packages.length > 0 && (
              <Field>
                <FieldLabel htmlFor="package">Package (Optional)</FieldLabel>
                <Select
                  value={formData.package_id}
                  onValueChange={(value) => setFormData({ ...formData, package_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Package</SelectItem>
                    {packages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting && <Spinner className="mr-2" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
