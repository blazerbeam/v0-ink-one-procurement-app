"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Event } from "@/lib/types"
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
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"

interface EditEventSheetProps {
  event: Event | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

export function EditEventSheet({
  event,
  open,
  onOpenChange,
  onUpdate,
}: EditEventSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    event_name: "",
    org_name: "",
    mission: "",
    location: "",
    event_date: "",
    guest_count: "",
    fundraising_goal: "",
  })

  // Update form data when event changes
  useEffect(() => {
    if (open && event) {
      setFormData({
        event_name: event.event_name || "",
        org_name: event.org_name || "",
        mission: event.mission || "",
        location: event.location || "",
        event_date: event.event_date || "",
        guest_count: event.guest_count?.toString() || "",
        fundraising_goal: event.fundraising_goal?.toString() || "",
      })
    }
  }, [open, event])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!event || !formData.event_name.trim() || !formData.org_name.trim()) return

    setIsSubmitting(true)

    const supabase = createClient()
    const { error } = await supabase
      .from("events")
      .update({
        event_name: formData.event_name.trim(),
        org_name: formData.org_name.trim(),
        mission: formData.mission.trim() || null,
        location: formData.location.trim() || null,
        event_date: formData.event_date || null,
        guest_count: formData.guest_count ? Number(formData.guest_count) : null,
        fundraising_goal: formData.fundraising_goal ? Number(formData.fundraising_goal) : null,
      })
      .eq("id", event.id)

    setIsSubmitting(false)

    if (!error) {
      onOpenChange(false)
      onUpdate()
    }
  }

  if (!event) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Event</SheetTitle>
          <SheetDescription>
            Update the event details below.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="event_name">Event Name *</FieldLabel>
              <Input
                id="event_name"
                value={formData.event_name}
                onChange={(e) => setFormData({ ...formData, event_name: e.target.value })}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="org_name">Organization Name *</FieldLabel>
              <Input
                id="org_name"
                value={formData.org_name}
                onChange={(e) => setFormData({ ...formData, org_name: e.target.value })}
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="mission">Mission</FieldLabel>
              <Textarea
                id="mission"
                value={formData.mission}
                onChange={(e) => setFormData({ ...formData, mission: e.target.value })}
                placeholder="Describe your organization's mission..."
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Event venue or city"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="event_date">Event Date</FieldLabel>
              <Input
                id="event_date"
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="guest_count">Guest Count</FieldLabel>
                <Input
                  id="guest_count"
                  type="number"
                  min="0"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({ ...formData, guest_count: e.target.value })}
                  placeholder="Expected guests"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fundraising_goal">Fundraising Goal ($)</FieldLabel>
                <Input
                  id="fundraising_goal"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.fundraising_goal}
                  onChange={(e) => setFormData({ ...formData, fundraising_goal: e.target.value })}
                  placeholder="Target amount"
                />
              </Field>
            </div>
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
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
