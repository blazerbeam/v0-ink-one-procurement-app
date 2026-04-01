"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Item, ItemStatus, Package, Volunteer, STATUS_LABELS } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Trash2 } from "lucide-react"

interface EditItemSheetProps {
  item: Item | null
  packages: Package[]
  volunteers: Volunteer[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

const statusOptions: ItemStatus[] = ["expected", "confirmed", "received", "missing", "fulfilled"]

export function EditItemSheet({
  item,
  packages,
  volunteers,
  open,
  onOpenChange,
  onUpdate,
}: EditItemSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    donor_name: "",
    estimated_value: "",
    status: "expected" as ItemStatus,
    owner_id: "none",
    package_id: "none",
  })

  // Update form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || "",
        description: item.description || "",
        donor_name: item.donor_name || "",
        estimated_value: item.estimated_value?.toString() || "",
        status: item.status,
        owner_id: item.owner_id || "none",
        package_id: item.package_id || "none",
      })
    }
  }, [item])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!item || !formData.name.trim()) return

    setIsSubmitting(true)

    // Get owner name from volunteer if selected
    const ownerId = formData.owner_id !== "none" ? formData.owner_id : null
    const selectedVolunteer = ownerId ? volunteers.find(v => v.id === ownerId) : null
    const ownerName = selectedVolunteer
      ? `${selectedVolunteer.first_name} ${selectedVolunteer.last_name}`
      : null
    const packageId = formData.package_id !== "none" ? formData.package_id : null

    const supabase = createClient()
    const { error } = await supabase
      .from("items")
      .update({
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        donor_name: formData.donor_name.trim() || null,
        estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
        status: formData.status,
        owner_id: ownerId,
        owner_name: ownerName,
        package_id: packageId,
      })
      .eq("id", item.id)

    setIsSubmitting(false)

    if (!error) {
      onOpenChange(false)
      onUpdate()
    }
  }

  const handleDelete = async () => {
    if (!item) return
    
    const supabase = createClient()
    await supabase.from("items").delete().eq("id", item.id)
    onOpenChange(false)
    onUpdate()
  }

  if (!item) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Item</SheetTitle>
          <SheetDescription>
            Update the item details or reassign to a different package.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Item Name *</FieldLabel>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="donor_name">Donor Name</FieldLabel>
              <Input
                id="donor_name"
                value={formData.donor_name}
                onChange={(e) => setFormData({ ...formData, donor_name: e.target.value })}
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
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="status">Status</FieldLabel>
              <Select
                value={formData.status}
                onValueChange={(value: ItemStatus) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger id="status">
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
              <FieldLabel htmlFor="owner">Owner / Assignee</FieldLabel>
              <Select
                value={formData.owner_id}
                onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
              >
                <SelectTrigger id="owner">
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
            </Field>

            <Field>
              <FieldLabel htmlFor="package">Package</FieldLabel>
              <Select
                value={formData.package_id}
                onValueChange={(value) => setFormData({ ...formData, package_id: value })}
              >
                <SelectTrigger id="package">
                  <SelectValue placeholder="Select package" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Package (Unassigned)</SelectItem>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <SheetFooter className="flex-col gap-3 sm:flex-col">
            <div className="flex gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1">
                {isSubmitting ? <Spinner className="mr-2" /> : null}
                Save Changes
              </Button>
            </div>
            
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Item
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Item</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete &quot;{item.name}&quot;? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
