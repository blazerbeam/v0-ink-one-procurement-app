"use client"

import { useState } from "react"
import { ChevronDown, Plus } from "lucide-react"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { createClient } from "@/lib/supabase/client"
import type { EventFormData } from "@/lib/types"

interface CreateEventDialogProps {
  onEventCreated: () => void
}

export function CreateEventDialog({ onEventCreated }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [formData, setFormData] = useState<EventFormData>({
    org_name: "",
    event_name: "",
    mission: "",
    location: "",
    event_date: "",
    guest_count: "",
    fundraising_goal: "",
    // Organization profile fields
    legal_name: "",
    dba_name: "",
    org_address: "",
    tax_id: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    website: "",
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
        // Organization profile fields
        legal_name: formData.legal_name || null,
        dba_name: formData.dba_name || null,
        org_address: formData.org_address || null,
        tax_id: formData.tax_id || null,
        contact_name: formData.contact_name || null,
        contact_email: formData.contact_email || null,
        contact_phone: formData.contact_phone || null,
        website: formData.website || null,
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
        legal_name: "",
        dba_name: "",
        org_address: "",
        tax_id: "",
        contact_name: "",
        contact_email: "",
        contact_phone: "",
        website: "",
      })
      setOpen(false)
      setProfileOpen(false)
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

          {/* Organization Profile - Collapsible */}
          <Collapsible open={profileOpen} onOpenChange={setProfileOpen} className="mt-6">
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="flex w-full items-center justify-between p-0 font-semibold hover:bg-transparent"
              >
                <span>Organization Profile (for Donation Letters)</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${profileOpen ? "rotate-180" : ""}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <p className="text-sm text-muted-foreground mb-4">
                This information will be used to generate professional donation acknowledgment letters.
              </p>
              <FieldGroup>
                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="legal_name">Legal Name</FieldLabel>
                    <Input
                      id="legal_name"
                      name="legal_name"
                      value={formData.legal_name}
                      onChange={handleChange}
                      placeholder="Full legal name"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="dba_name">DBA Name</FieldLabel>
                    <Input
                      id="dba_name"
                      name="dba_name"
                      value={formData.dba_name}
                      onChange={handleChange}
                      placeholder="Doing business as"
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="org_address">Address</FieldLabel>
                  <Textarea
                    id="org_address"
                    name="org_address"
                    value={formData.org_address}
                    onChange={handleChange}
                    placeholder="Full mailing address"
                    rows={2}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="tax_id">Tax ID / EIN</FieldLabel>
                    <Input
                      id="tax_id"
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleChange}
                      placeholder="XX-XXXXXXX"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="website">Website</FieldLabel>
                    <Input
                      id="website"
                      name="website"
                      value={formData.website}
                      onChange={handleChange}
                      placeholder="https://..."
                    />
                  </Field>
                </div>

                <Field>
                  <FieldLabel htmlFor="contact_name">Primary Contact Name</FieldLabel>
                  <Input
                    id="contact_name"
                    name="contact_name"
                    value={formData.contact_name}
                    onChange={handleChange}
                    placeholder="Full name"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="contact_email">Contact Email</FieldLabel>
                    <Input
                      id="contact_email"
                      name="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={handleChange}
                      placeholder="email@org.com"
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="contact_phone">Contact Phone</FieldLabel>
                    <Input
                      id="contact_phone"
                      name="contact_phone"
                      type="tel"
                      value={formData.contact_phone}
                      onChange={handleChange}
                      placeholder="(555) 123-4567"
                    />
                  </Field>
                </div>
              </FieldGroup>
            </CollapsibleContent>
          </Collapsible>

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
