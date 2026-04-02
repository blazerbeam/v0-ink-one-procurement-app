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
import { ItemFormData, ItemStatus, Package, Volunteer, STATUS_LABELS } from "@/lib/types"
import { AddVolunteerDialog } from "./add-volunteer-dialog"

interface AddItemDialogProps {
  eventId: string
  packages: Package[]
  volunteers: Volunteer[]
  onItemAdded: () => void
  onVolunteerAdded: () => void
  defaultPackageId?: string
  trigger?: React.ReactNode
}

const statusOptions: ItemStatus[] = ["needed", "contacted", "confirmed", "received", "fulfilled", "declined"]

export function AddItemDialog({ 
  eventId, 
  packages, 
  volunteers, 
  onItemAdded, 
  onVolunteerAdded,
  defaultPackageId,
  trigger,
}: AddItemDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<ItemFormData>({
    name: "",
    description: "",
    business_name: "",
    contact_name: "",
    estimated_value: "",
    status: "needed",
    owner_id: "",
    package_id: defaultPackageId || "",
  })

  // Reset form when dialog opens with new defaultPackageId
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && defaultPackageId) {
      setFormData(prev => ({ ...prev, package_id: defaultPackageId }))
    }
    setOpen(newOpen)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    // Get owner name from volunteer if selected
    const ownerId = formData.owner_id && formData.owner_id !== "none" ? formData.owner_id : null
    const selectedVolunteer = ownerId ? volunteers.find(v => v.id === ownerId) : null
    const ownerName = selectedVolunteer 
      ? `${selectedVolunteer.first_name} ${selectedVolunteer.last_name}`
      : null
    const packageId = formData.package_id && formData.package_id !== "none" ? formData.package_id : null

    const { error } = await supabase.from("items").insert({
      event_id: eventId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      business_name: formData.business_name.trim() || null,
      contact_name: formData.contact_name.trim() || null,
      donor_name: formData.business_name.trim() || null, // backwards compat
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      status: formData.status,
      owner_id: ownerId,
      owner_name: ownerName,
      package_id: packageId,
    })

    setIsSubmitting(false)

    if (!error) {
      setFormData({
        name: "",
        description: "",
        business_name: "",
        contact_name: "",
        estimated_value: "",
        status: "needed",
        owner_id: "",
        package_id: "",
      })
      setOpen(false)
      onItemAdded()
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Item
          </Button>
        )}
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
                <FieldLabel htmlFor="business_name">Business Name</FieldLabel>
                <Input
                  id="business_name"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="e.g., Local Hotel"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="contact_name">Contact Name</FieldLabel>
                <Input
                  id="contact_name"
                  value={formData.contact_name}
                  onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                  placeholder="e.g., John Smith"
                />
              </Field>
            </div>
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
                    {statusOptions.map((status) => (
                      <SelectItem key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="owner">Owner/Assignee</FieldLabel>
                <div className="flex gap-2">
                  <Select
                    value={formData.owner_id}
                    onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select volunteer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {volunteers.map((volunteer) => (
                        <SelectItem key={volunteer.id} value={volunteer.id}>
                          {volunteer.first_name} {volunteer.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <AddVolunteerDialog 
                    eventId={eventId} 
                    onVolunteerAdded={onVolunteerAdded}
                    variant="inline"
                  />
                </div>
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
                    <SelectItem value="none">No Package</SelectItem>
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
