"use client"

import { useState } from "react"
import Link from "next/link"
import useSWR from "swr"
import {
  ArrowLeft,
  Briefcase,
  Globe,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { Business, Contact, Org } from "@/lib/types"

interface BusinessesProps {
  orgId: string
}

interface BusinessesData {
  org: Org | null
  businesses: (Business & { contact_count: number })[]
}

const emptyBusinessForm = {
  name: "",
  category: "",
  website: "",
  notes: "",
}

const emptyContactForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  title: "",
  notes: "",
}

export function Businesses({ orgId }: BusinessesProps) {
  const fetcher = async (): Promise<BusinessesData> => {
    const supabase = createClient()

    const [orgResult, businessesResult] = await Promise.all([
      supabase.from("orgs").select("*").eq("id", orgId).single(),
      supabase.from("businesses").select("*").eq("org_id", orgId).order("name", { ascending: true }),
    ])

    // Get contact counts for each business
    const businesses = businessesResult.data || []
    const businessesWithCounts = await Promise.all(
      businesses.map(async (business) => {
        const { count } = await supabase
          .from("contacts")
          .select("*", { count: "exact", head: true })
          .eq("business_id", business.id)
        return { ...business, contact_count: count || 0 }
      })
    )

    return {
      org: orgResult.data as Org | null,
      businesses: businessesWithCounts as (Business & { contact_count: number })[],
    }
  }

  const { data, error, isLoading, mutate } = useSWR(`businesses-${orgId}`, fetcher)

  // Selected business state
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null)

  // Business sheet state
  const [businessSheetOpen, setBusinessSheetOpen] = useState(false)
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null)
  const [businessForm, setBusinessForm] = useState(emptyBusinessForm)
  const [isSubmittingBusiness, setIsSubmittingBusiness] = useState(false)

  // Contact sheet state
  const [contactSheetOpen, setContactSheetOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [contactForm, setContactForm] = useState(emptyContactForm)
  const [isSubmittingContact, setIsSubmittingContact] = useState(false)

  // Delete dialog state
  const [deleteBusinessId, setDeleteBusinessId] = useState<string | null>(null)
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null)

  // Contacts for selected business
  const contactsFetcher = async (): Promise<Contact[]> => {
    if (!selectedBusinessId) return []
    const supabase = createClient()
    const { data } = await supabase
      .from("contacts")
      .select("*")
      .eq("business_id", selectedBusinessId)
      .order("first_name", { ascending: true })
    return (data || []) as Contact[]
  }

  const {
    data: contacts,
    isLoading: contactsLoading,
    mutate: mutateContacts,
  } = useSWR(selectedBusinessId ? `contacts-${selectedBusinessId}` : null, contactsFetcher)

  const selectedBusiness = data?.businesses.find((b) => b.id === selectedBusinessId)

  // Business handlers
  const openCreateBusinessSheet = () => {
    setEditingBusiness(null)
    setBusinessForm(emptyBusinessForm)
    setBusinessSheetOpen(true)
  }

  const openEditBusinessSheet = (business: Business) => {
    setEditingBusiness(business)
    setBusinessForm({
      name: business.name || "",
      category: business.category || "",
      website: business.website || "",
      notes: business.notes || "",
    })
    setBusinessSheetOpen(true)
  }

  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!businessForm.name.trim()) return

    setIsSubmittingBusiness(true)
    const supabase = createClient()

    if (editingBusiness) {
      await supabase
        .from("businesses")
        .update({
          name: businessForm.name.trim(),
          category: businessForm.category.trim() || null,
          website: businessForm.website.trim() || null,
          notes: businessForm.notes.trim() || null,
        })
        .eq("id", editingBusiness.id)
    } else {
      await supabase.from("businesses").insert({
        org_id: orgId,
        name: businessForm.name.trim(),
        category: businessForm.category.trim() || null,
        website: businessForm.website.trim() || null,
        notes: businessForm.notes.trim() || null,
      })
    }

    setIsSubmittingBusiness(false)
    setBusinessSheetOpen(false)
    mutate()
  }

  const handleDeleteBusiness = async () => {
    if (!deleteBusinessId) return
    const supabase = createClient()
    
    // Delete contacts first, then business
    await supabase.from("contacts").delete().eq("business_id", deleteBusinessId)
    await supabase.from("businesses").delete().eq("id", deleteBusinessId)
    
    if (selectedBusinessId === deleteBusinessId) {
      setSelectedBusinessId(null)
    }
    setDeleteBusinessId(null)
    mutate()
  }

  // Contact handlers
  const openCreateContactSheet = () => {
    setEditingContact(null)
    setContactForm(emptyContactForm)
    setContactSheetOpen(true)
  }

  const openEditContactSheet = (contact: Contact) => {
    setEditingContact(contact)
    setContactForm({
      first_name: contact.first_name || "",
      last_name: contact.last_name || "",
      email: contact.email || "",
      phone: contact.phone || "",
      title: contact.title || "",
      notes: contact.notes || "",
    })
    setContactSheetOpen(true)
  }

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contactForm.first_name.trim() || !selectedBusinessId) return

    setIsSubmittingContact(true)
    const supabase = createClient()

    if (editingContact) {
      await supabase
        .from("contacts")
        .update({
          first_name: contactForm.first_name.trim(),
          last_name: contactForm.last_name.trim() || null,
          email: contactForm.email.trim() || null,
          phone: contactForm.phone.trim() || null,
          title: contactForm.title.trim() || null,
          notes: contactForm.notes.trim() || null,
        })
        .eq("id", editingContact.id)
    } else {
      await supabase.from("contacts").insert({
        business_id: selectedBusinessId,
        first_name: contactForm.first_name.trim(),
        last_name: contactForm.last_name.trim() || null,
        email: contactForm.email.trim() || null,
        phone: contactForm.phone.trim() || null,
        title: contactForm.title.trim() || null,
        notes: contactForm.notes.trim() || null,
      })
    }

    setIsSubmittingContact(false)
    setContactSheetOpen(false)
    mutateContacts()
    mutate() // Refresh business contact counts
  }

  const handleDeleteContact = async () => {
    if (!deleteContactId) return
    const supabase = createClient()
    await supabase.from("contacts").delete().eq("id", deleteContactId)
    setDeleteContactId(null)
    mutateContacts()
    mutate() // Refresh business contact counts
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
          <p className="text-destructive">Failed to load businesses. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/app"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to Events
        </Link>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              {isLoading ? <Skeleton className="h-8 w-48" /> : data?.org?.name || "Organization"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Manage businesses and contacts for this organization.
            </p>
          </div>
          <Button onClick={openCreateBusinessSheet}>
            <Plus className="mr-2 h-4 w-4" />
            Add Business
          </Button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex gap-6">
        {/* Businesses list - 65% */}
        <div className="w-[65%]">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                </Card>
              ))}
            </div>
          ) : data?.businesses && data.businesses.length > 0 ? (
            <div className="space-y-3">
              {data.businesses.map((business) => (
                <Card
                  key={business.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedBusinessId === business.id ? "ring-2 ring-primary bg-muted/30" : ""
                  }`}
                  onClick={() => setSelectedBusinessId(business.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{business.name}</h3>
                        {business.category && (
                          <Badge variant="secondary" className="text-xs">
                            {business.category}
                          </Badge>
                        )}
                      </div>
                      {business.website && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                          <Globe className="h-3.5 w-3.5" />
                          <a
                            href={business.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline truncate"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {business.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                        <Users className="h-3.5 w-3.5" />
                        <span>{business.contact_count} contact{business.contact_count !== 1 ? "s" : ""}</span>
                      </div>
                      {business.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{business.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditBusinessSheet(business)
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteBusinessId(business.id)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty>
              <EmptyMedia variant="icon">
                <Briefcase className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No businesses yet</EmptyTitle>
              <EmptyDescription>
                Add businesses to track potential donors and sponsors for your events.
              </EmptyDescription>
              <Button className="mt-4" onClick={openCreateBusinessSheet}>
                <Plus className="mr-2 h-4 w-4" />
                Add Business
              </Button>
            </Empty>
          )}
        </div>

        {/* Contact detail panel - 35% */}
        <div className="w-[35%]">
          <Card className="p-4 h-full min-h-[400px]">
            {selectedBusiness ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">{selectedBusiness.name} Contacts</h3>
                  <Button size="sm" onClick={openCreateContactSheet}>
                    <Plus className="mr-1.5 h-4 w-4" />
                    Add Contact
                  </Button>
                </div>

                {contactsLoading ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <div key={i} className="p-3 rounded-lg border">
                        <Skeleton className="h-4 w-1/2 mb-2" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : contacts && contacts.length > 0 ? (
                  <div className="space-y-3">
                    {contacts.map((contact) => (
                      <div key={contact.id} className="p-3 rounded-lg border bg-muted/30">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">
                                {contact.first_name} {contact.last_name}
                              </span>
                            </div>
                            {contact.title && (
                              <p className="text-sm text-muted-foreground mb-1">{contact.title}</p>
                            )}
                            {contact.email && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Mail className="h-3.5 w-3.5" />
                                <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                                  {contact.email}
                                </a>
                              </div>
                            )}
                            {contact.phone && (
                              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <a href={`tel:${contact.phone}`} className="hover:underline">
                                  {contact.phone}
                                </a>
                              </div>
                            )}
                            {contact.notes && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {contact.notes}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => openEditContactSheet(contact)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setDeleteContactId(contact.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span className="sr-only">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No contacts yet</p>
                    <Button size="sm" variant="outline" className="mt-3" onClick={openCreateContactSheet}>
                      <Plus className="mr-1.5 h-4 w-4" />
                      Add Contact
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                <Briefcase className="h-10 w-10 mb-3 opacity-50" />
                <p className="font-medium">Select a business</p>
                <p className="text-sm">Click on a business to view and manage its contacts</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Business Sheet */}
      <Sheet open={businessSheetOpen} onOpenChange={setBusinessSheetOpen}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingBusiness ? "Edit Business" : "Add Business"}</SheetTitle>
            <SheetDescription>
              {editingBusiness
                ? "Update the business details."
                : "Add a new business to track as a potential donor or sponsor."}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleBusinessSubmit} className="flex-1 overflow-y-auto px-6 py-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="business-name">Business Name *</FieldLabel>
                <Input
                  id="business-name"
                  value={businessForm.name}
                  onChange={(e) => setBusinessForm({ ...businessForm, name: e.target.value })}
                  placeholder="e.g. Acme Corporation"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="business-category">Category</FieldLabel>
                <Input
                  id="business-category"
                  value={businessForm.category}
                  onChange={(e) => setBusinessForm({ ...businessForm, category: e.target.value })}
                  placeholder="e.g. Restaurant, Retail, Tech"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="business-website">Website</FieldLabel>
                <Input
                  id="business-website"
                  type="url"
                  value={businessForm.website}
                  onChange={(e) => setBusinessForm({ ...businessForm, website: e.target.value })}
                  placeholder="https://www.example.com"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="business-notes">Notes</FieldLabel>
                <Textarea
                  id="business-notes"
                  value={businessForm.notes}
                  onChange={(e) => setBusinessForm({ ...businessForm, notes: e.target.value })}
                  placeholder="Any additional notes about this business..."
                  rows={3}
                />
              </Field>
            </FieldGroup>

            <SheetFooter className="flex-col gap-3 sm:flex-col mt-6">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBusinessSheetOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingBusiness} className="flex-1">
                  {isSubmittingBusiness ? <Spinner className="mr-2" /> : null}
                  {editingBusiness ? "Save Changes" : "Add Business"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Contact Sheet */}
      <Sheet open={contactSheetOpen} onOpenChange={setContactSheetOpen}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>{editingContact ? "Edit Contact" : "Add Contact"}</SheetTitle>
            <SheetDescription>
              {editingContact
                ? "Update the contact details."
                : `Add a new contact for ${selectedBusiness?.name || "this business"}.`}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleContactSubmit} className="flex-1 overflow-y-auto px-6 py-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="contact-first-name">First Name *</FieldLabel>
                <Input
                  id="contact-first-name"
                  value={contactForm.first_name}
                  onChange={(e) => setContactForm({ ...contactForm, first_name: e.target.value })}
                  placeholder="John"
                  required
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contact-last-name">Last Name</FieldLabel>
                <Input
                  id="contact-last-name"
                  value={contactForm.last_name}
                  onChange={(e) => setContactForm({ ...contactForm, last_name: e.target.value })}
                  placeholder="Doe"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contact-email">Email</FieldLabel>
                <Input
                  id="contact-email"
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                  placeholder="john@example.com"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contact-phone">Phone</FieldLabel>
                <Input
                  id="contact-phone"
                  type="tel"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contact-title">Title</FieldLabel>
                <Input
                  id="contact-title"
                  value={contactForm.title}
                  onChange={(e) => setContactForm({ ...contactForm, title: e.target.value })}
                  placeholder="e.g. Marketing Manager"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="contact-notes">Notes</FieldLabel>
                <Textarea
                  id="contact-notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                  placeholder="Any additional notes about this contact..."
                  rows={3}
                />
              </Field>
            </FieldGroup>

            <SheetFooter className="flex-col gap-3 sm:flex-col mt-6">
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContactSheetOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmittingContact} className="flex-1">
                  {isSubmittingContact ? <Spinner className="mr-2" /> : null}
                  {editingContact ? "Save Changes" : "Add Contact"}
                </Button>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      {/* Delete Business Dialog */}
      <AlertDialog open={!!deleteBusinessId} onOpenChange={() => setDeleteBusinessId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Business</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this business? This will also delete all associated
              contacts. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBusiness}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Contact Dialog */}
      <AlertDialog open={!!deleteContactId} onOpenChange={() => setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this contact? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteContact}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
