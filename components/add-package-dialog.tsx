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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { FolderPlus } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PackageFormData } from "@/lib/types"

interface AddPackageDialogProps {
  eventId: string
  onPackageAdded: () => void
}

export function AddPackageDialog({ eventId, onPackageAdded }: AddPackageDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<PackageFormData>({
    name: "",
    description: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from("packages").insert({
      event_id: eventId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
    })

    setIsSubmitting(false)

    if (!error) {
      setFormData({ name: "", description: "" })
      setOpen(false)
      onPackageAdded()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FolderPlus className="mr-2 h-4 w-4" />
          Add Package
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Package</DialogTitle>
            <DialogDescription>
              Create a package to group related items together.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="package-name">Package Name *</FieldLabel>
              <Input
                id="package-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Silent Auction Items"
                required
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="package-description">Description</FieldLabel>
              <Textarea
                id="package-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this package"
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.name.trim()}>
              {isSubmitting && <Spinner className="mr-2" />}
              Create Package
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
