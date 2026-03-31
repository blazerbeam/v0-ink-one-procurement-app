"use client"

import { useState } from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { createClient } from "@/lib/supabase/client"
import type { EventFormData } from "@/lib/types"

interface CreateEventDialogProps {
  onEventCreated: () => void
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    org_name: "",
    event_name: "",
    mission: "",
    location: "",
    event_date: "",
    guest_count: "",
    fundraising_goal: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { error } = await supabase.from("events").insert({
        org_name: formData.org_name,
        event_name: formData.event_name,
        mission: formData.mission || null,
        location: formData.location || null,
        event_date: formData.event_date || null,
        guest_count: formData.guest_count ? Number(formData.guest_count) : null,
        fundraising_goal: formData.fundraising_goal ? Number(formData.fundraising_goal) : null,
        items_secured: 0,
        total_items: 0,
        status: "upcoming",
      })

      if (error) throw error

      setFormData({
        org_name: "",
        event_name: "",
        mission: "",
        location: "",
        event_date: "",
        guest_count: "",
        fundraising_goal: "",
      })
      setOpen(false)
      onEventCreated()
    } catch (error) {
      console.error("Error creating event:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Event
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Event</DialogTitle>
          <DialogDescription>
            Set up a new gala event for your nonprofit organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="mt-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="org_name">Organization Name *</FieldLabel>
              <Input
                id="org_name"
                name="org_name"
                value={formData.org_name}
                onChange={handleChange}
                placeholder="e.g., Local Food Bank"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="event_name">Event Name *</FieldLabel>
              <Input
                id="event_name"
                name="event_name"
                value={formData.event_name}
                onChange={handleChange}
                placeholder="e.g., Annual Spring Gala 2026"
                required
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="mission">Mission Statement</FieldLabel>
              <Textarea
                id="mission"
                name="mission"
                value={formData.mission}
                onChange={handleChange}
                placeholder="Describe the purpose and goals of your event..."
                rows={3}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="location">Location</FieldLabel>
              <Input
                id="location"
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="e.g., Grand Ballroom, City Center"
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="event_date">Event Date</FieldLabel>
              <Input
                id="event_date"
                name="event_date"
                type="date"
                value={formData.event_date}
                onChange={handleChange}
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="guest_count">Expected Guests</FieldLabel>
                <Input
                  id="guest_count"
                  name="guest_count"
                  type="number"
                  min="0"
                  value={formData.guest_count}
                  onChange={handleChange}
                  placeholder="e.g., 200"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="fundraising_goal">Fundraising Goal ($)</FieldLabel>
                <Input
                  id="fundraising_goal"
                  name="fundraising_goal"
                  type="number"
                  min="0"
                  step="100"
                  value={formData.fundraising_goal}
                  onChange={handleChange}
                  placeholder="e.g., 50000"
                />
              </Field>
            </div>
          </FieldGroup>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Spinner className="mr-2" />}
              Create Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
