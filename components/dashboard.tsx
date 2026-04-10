"use client"

import { useState } from "react"
import useSWR from "swr"
import { Building2, Briefcase, PartyPopper, Pencil, Plus } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { EventCard } from "@/components/event-card"
import { CreateEventDialog } from "@/components/create-event-dialog"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import type { Event, Org } from "@/lib/types"

interface DashboardData {
  orgs: Org[]
  events: Event[]
}

const fetcher = async (): Promise<DashboardData> => {
  const supabase = createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  let orgs: Org[] = []
  
  if (user) {
    // Fetch orgs the user is a member of
    const { data: orgMembers } = await supabase
      .from("org_members")
      .select("org_id")
      .eq("user_id", user.id)
    
    if (orgMembers && orgMembers.length > 0) {
      const orgIds = orgMembers.map(m => m.org_id)
      const { data: orgsData } = await supabase
        .from("orgs")
        .select("*")
        .in("id", orgIds)
        .order("name", { ascending: true })
      
      orgs = (orgsData || []) as Org[]
    }
  }
  
  // Fetch all events
  const { data: eventsData, error } = await supabase
    .from("events")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw error
  
  return {
    orgs,
    events: (eventsData || []) as Event[]
  }
}

const emptyOrgForm = {
  name: "",
  legal_name: "",
  dba_name: "",
  address: "",
  tax_id: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  website: "",
  mission: "",
}

export function Dashboard() {
  const { data, error, isLoading, mutate } = useSWR("dashboard", fetcher)
  const [orgSheetOpen, setOrgSheetOpen] = useState(false)
  const [editingOrg, setEditingOrg] = useState<Org | null>(null)
  const [orgForm, setOrgForm] = useState(emptyOrgForm)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const openCreateOrgSheet = () => {
    setEditingOrg(null)
    setOrgForm(emptyOrgForm)
    setOrgSheetOpen(true)
  }

  const openEditOrgSheet = (org: Org) => {
    setEditingOrg(org)
    setOrgForm({
      name: org.name || "",
      legal_name: org.legal_name || "",
      dba_name: org.dba_name || "",
      address: org.address || "",
      tax_id: org.tax_id || "",
      contact_name: org.contact_name || "",
      contact_email: org.contact_email || "",
      contact_phone: org.contact_phone || "",
      website: org.website || "",
      mission: org.mission || "",
    })
    setOrgSheetOpen(true)
  }

  const handleOrgSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgForm.name.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    if (editingOrg) {
      // Update existing org
      await supabase
        .from("orgs")
        .update({
          name: orgForm.name.trim(),
          legal_name: orgForm.legal_name.trim() || null,
          dba_name: orgForm.dba_name.trim() || null,
          address: orgForm.address.trim() || null,
          tax_id: orgForm.tax_id.trim() || null,
          contact_name: orgForm.contact_name.trim() || null,
          contact_email: orgForm.contact_email.trim() || null,
          contact_phone: orgForm.contact_phone.trim() || null,
          website: orgForm.website.trim() || null,
          mission: orgForm.mission.trim() || null,
        })
        .eq("id", editingOrg.id)
    } else {
      // Create new org and add current user as admin
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: newOrg } = await supabase
        .from("orgs")
        .insert({
          name: orgForm.name.trim(),
          legal_name: orgForm.legal_name.trim() || null,
          dba_name: orgForm.dba_name.trim() || null,
          address: orgForm.address.trim() || null,
          tax_id: orgForm.tax_id.trim() || null,
          contact_name: orgForm.contact_name.trim() || null,
          contact_email: orgForm.contact_email.trim() || null,
          contact_phone: orgForm.contact_phone.trim() || null,
          website: orgForm.website.trim() || null,
          mission: orgForm.mission.trim() || null,
        })
        .select()
        .single()

      if (newOrg && user) {
        await supabase
          .from("org_members")
          .insert({
            org_id: newOrg.id,
            user_id: user.id,
            role: "admin",
          })
      }
    }

    setIsSubmitting(false)
    setOrgSheetOpen(false)
    mutate()
  }

  // Group events by org
  const eventsByOrg = (data?.events || []).reduce((acc, event) => {
    const orgId = event.org_id || "uncategorized"
    if (!acc[orgId]) acc[orgId] = []
    acc[orgId].push(event)
    return acc
  }, {} as Record<string, Event[]>)

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">
            Failed to load events. Please try again later.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Your Events
          </h1>
          <p className="mt-1 text-muted-foreground">
            Manage procurement for your upcoming galas and fundraisers.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openCreateOrgSheet}>
            <Plus className="mr-2 h-4 w-4" />
            Create Org
          </Button>
          <CreateEventDialog orgs={data?.orgs || []} onEventCreated={() => mutate()} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-8">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="mb-4 h-6 w-48" />
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="rounded-lg border bg-card p-6">
                    <div className="space-y-3">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : data?.events && data.events.length > 0 ? (
        <div className="space-y-10">
          {/* Render orgs with their events */}
          {data.orgs.map((org) => {
            const orgEvents = eventsByOrg[org.id] || []
            if (orgEvents.length === 0) return null
            
            return (
              <section key={org.id}>
                <div className="mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-xl font-semibold">{org.name}</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => openEditOrgSheet(org)}
                  >
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit organization</span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-muted-foreground hover:text-foreground"
                    asChild
                  >
                    <Link href={`/app/businesses/${org.id}`}>
                      <Briefcase className="mr-1.5 h-4 w-4" />
                      Businesses
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {orgEvents.map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </div>
              </section>
            )
          })}

          {/* Uncategorized events (no org_id) */}
          {eventsByOrg["uncategorized"] && eventsByOrg["uncategorized"].length > 0 && (
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <h2 className="text-xl font-semibold text-muted-foreground">Uncategorized</h2>
              </div>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {eventsByOrg["uncategorized"].map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Empty>
          <EmptyMedia variant="icon">
            <PartyPopper className="h-6 w-6" />
          </EmptyMedia>
          <EmptyTitle>No events yet</EmptyTitle>
          <EmptyDescription>
            Create your first organization and event to start managing procurement for your gala.
          </EmptyDescription>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={openCreateOrgSheet}>
              <Plus className="mr-2 h-4 w-4" />
              Create Org
            </Button>
            <CreateEventDialog orgs={data?.orgs || []} onEventCreated={() => mutate()} />
          </div>
        </Empty>
      )}

      {/* Create/Edit Org Sheet */}
      <Sheet open={orgSheetOpen} onOpenChange={setOrgSheetOpen}>
        <SheetContent className="sm:max-w-lg flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingOrg ? "Edit Organization" : "Create Organization"}</SheetTitle>
            <SheetDescription>
              {editingOrg 
                ? "Update your organization's details."
                : "Add a new organization to manage events under."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleOrgSubmit} className="flex-1 overflow-y-auto px-6 py-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="org-name">Organization Name *</FieldLabel>
                <Input
                  id="org-name"
                  value={orgForm.name}
                  onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                  placeholder="e.g. Community Foundation"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-legal-name">Legal Name</FieldLabel>
                <Input
                  id="org-legal-name"
                  value={orgForm.legal_name}
                  onChange={(e) => setOrgForm({ ...orgForm, legal_name: e.target.value })}
                  placeholder="Official registered name"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-dba-name">DBA Name</FieldLabel>
                <Input
                  id="org-dba-name"
                  value={orgForm.dba_name}
                  onChange={(e) => setOrgForm({ ...orgForm, dba_name: e.target.value })}
                  placeholder="Doing business as..."
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-address">Address</FieldLabel>
                <Textarea
                  id="org-address"
                  value={orgForm.address}
                  onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                  placeholder="Street address, city, state, zip"
                  rows={2}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-tax-id">Tax ID</FieldLabel>
                <Input
                  id="org-tax-id"
                  value={orgForm.tax_id}
                  onChange={(e) => setOrgForm({ ...orgForm, tax_id: e.target.value })}
                  placeholder="EIN or Tax ID number"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-contact-name">Contact Name</FieldLabel>
                <Input
                  id="org-contact-name"
                  value={orgForm.contact_name}
                  onChange={(e) => setOrgForm({ ...orgForm, contact_name: e.target.value })}
                  placeholder="Primary contact person"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-contact-email">Contact Email</FieldLabel>
                <Input
                  id="org-contact-email"
                  type="email"
                  value={orgForm.contact_email}
                  onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                  placeholder="contact@organization.org"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-contact-phone">Contact Phone</FieldLabel>
                <Input
                  id="org-contact-phone"
                  type="tel"
                  value={orgForm.contact_phone}
                  onChange={(e) => setOrgForm({ ...orgForm, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-website">Website</FieldLabel>
                <Input
                  id="org-website"
                  type="text"
                  value={orgForm.website}
                  onChange={(e) => setOrgForm({ ...orgForm, website: e.target.value })}
                  placeholder="www.organization.org"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="org-mission">Mission</FieldLabel>
                <Textarea
                  id="org-mission"
                  value={orgForm.mission}
                  onChange={(e) => setOrgForm({ ...orgForm, mission: e.target.value })}
                  placeholder="Organization's mission statement..."
                  rows={3}
                />
              </Field>
            </FieldGroup>

            <SheetFooter className="flex-col gap-3 sm:flex-col">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOrgSheetOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? <Spinner className="mr-2" /> : null}
                  {editingOrg ? "Save Changes" : "Create Organization"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
