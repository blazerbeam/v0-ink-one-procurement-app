"use client"

import { useState } from "react"
import { Plus, UserPlus } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"
import type { VolunteerFormData } from "@/lib/types"

interface AddVolunteerDialogProps {
  eventId: string
  onVolunteerAdded: () => void
  variant?: "default" | "inline"
}

export function AddVolunteerDialog({ eventId, onVolunteerAdded, variant = "default" }: AddVolunteerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<VolunteerFormData>({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.first_name.trim() || !formData.last_name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase.from("volunteers").insert({
      event_id: eventId,
      first_name: formData.first_name.trim(),
      last_name: formData.last_name.trim(),
      email: formData.email.trim() || null,
      phone: formData.phone.trim() || null,
      notes: formData.notes.trim() || null,
    })

    setIsSubmitting(false)

    if (!error) {
      setFormData({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        notes: "",
      })
      setOpen(false)
      onVolunteerAdded()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {variant === "inline" ? (
          <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs">
            <UserPlus className="h-3.5 w-3.5" />
            Add New
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="gap-1">
            <Plus className="h-4 w-4" />
            Add Volunteer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Volunteer</DialogTitle>
          <DialogDescription>
            Add a new volunteer to help manage procurement items.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup className="py-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel>First Name *</FieldLabel>
                <Input
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Jane"
                  required
                />
              </Field>
              <Field>
                <FieldLabel>Last Name *</FieldLabel>
                <Input
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Doe"
                  required
                />
              </Field>
            </div>
            <Field>
              <FieldLabel>Email</FieldLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="jane@example.org"
              />
            </Field>
            <Field>
              <FieldLabel>Phone</FieldLabel>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </Field>
            <Field>
              <FieldLabel>Notes</FieldLabel>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Board member, prefers email contact..."
                rows={2}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.first_name.trim() || !formData.last_name.trim()}>
              {isSubmitting ? <Spinner className="mr-2" /> : null}
              Add Volunteer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
