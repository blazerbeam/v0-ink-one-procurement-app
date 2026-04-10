"use client"

import { useState, useEffect } from "react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Plus, Check, ChevronsUpDown } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { ItemFormData, ItemStatus, Package, Volunteer, Business, Contact, STATUS_LABELS } from "@/lib/types"
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
  
  // Business/contact state
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [businessPopoverOpen, setBusinessPopoverOpen] = useState(false)
  
  // Inline dialog states for adding new business/contact
  const [addBusinessOpen, setAddBusinessOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState("")
  const [newBusinessCategory, setNewBusinessCategory] = useState("")
  const [newContactFirstName, setNewContactFirstName] = useState("")
  const [newContactLastName, setNewContactLastName] = useState("")
  const [isAddingBusiness, setIsAddingBusiness] = useState(false)
  const [isAddingContact, setIsAddingContact] = useState(false)

  const [formData, setFormData] = useState<ItemFormData & { business_id: string; contact_id: string }>({
    name: "",
    description: "",
    business_id: "none",
    business_name: "",
    contact_id: "none",
    contact_name: "",
    estimated_value: "",
    status: "needed",
    owner_id: "",
    package_id: defaultPackageId || "",
    notes: "",
  })

  // Fetch org_id from event when dialog opens
  useEffect(() => {
    if (open && eventId) {
      const fetchOrgId = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("events")
          .select("org_id")
          .eq("id", eventId)
          .single()
        
        if (data?.org_id) {
          setOrgId(data.org_id)
        }
      }
      fetchOrgId()
    }
  }, [open, eventId])

  // Fetch businesses when org_id is available
  useEffect(() => {
    if (orgId) {
      const fetchBusinesses = async () => {
        setLoadingBusinesses(true)
        const supabase = createClient()
        const { data } = await supabase
          .from("businesses")
          .select("*")
          .eq("org_id", orgId)
          .order("name", { ascending: true })
        
        setBusinesses(data || [])
        setLoadingBusinesses(false)
      }
      fetchBusinesses()
    }
  }, [orgId])

  // Fetch contacts when a business is selected
  useEffect(() => {
    if (formData.business_id && formData.business_id !== "none") {
      const fetchContacts = async () => {
        setLoadingContacts(true)
        const supabase = createClient()
        const { data } = await supabase
          .from("contacts")
          .select("*")
          .eq("business_id", formData.business_id)
          .order("first_name", { ascending: true })
        
        setContacts(data || [])
        setLoadingContacts(false)
      }
      fetchContacts()
    } else {
      setContacts([])
    }
  }, [formData.business_id])

  const handleBusinessSelect = (businessId: string) => {
    if (businessId === "add_new") {
      setBusinessPopoverOpen(false)
      setAddBusinessOpen(true)
      return
    }
    
    const selectedBusiness = businesses.find(b => b.id === businessId)
    setFormData({
      ...formData,
      business_id: businessId,
      business_name: selectedBusiness?.name || "",
      contact_id: "none",
      contact_name: "",
    })
    setBusinessPopoverOpen(false)
  }
  
  const clearBusiness = () => {
    setFormData({
      ...formData,
      business_id: "none",
      business_name: "",
      contact_id: "none",
      contact_name: "",
    })
  }

  const handleContactChange = (value: string) => {
    if (value === "add_new") {
      setAddContactOpen(true)
      return
    }
    
    const selectedContact = contacts.find(c => c.id === value)
    setFormData({
      ...formData,
      contact_id: value,
      contact_name: selectedContact ? `${selectedContact.first_name} ${selectedContact.last_name || ""}`.trim() : "",
    })
  }

  const handleAddBusiness = async () => {
    if (!newBusinessName.trim() || !orgId) return
    
    setIsAddingBusiness(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        org_id: orgId,
        name: newBusinessName.trim(),
        category: newBusinessCategory.trim() || null,
      })
      .select()
      .single()
    
    setIsAddingBusiness(false)
    
    if (!error && data) {
      const { data: refreshedBusinesses } = await supabase
        .from("businesses")
        .select("*")
        .eq("org_id", orgId)
        .order("name", { ascending: true })
      
      setBusinesses(refreshedBusinesses || [])
      setFormData({
        ...formData,
        business_id: data.id,
        business_name: data.name,
        contact_id: "none",
        contact_name: "",
      })
      setNewBusinessName("")
      setNewBusinessCategory("")
      setAddBusinessOpen(false)
    }
  }

  const handleAddContact = async () => {
    if (!newContactFirstName.trim() || formData.business_id === "none") return
    
    setIsAddingContact(true)
    const supabase = createClient()
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        business_id: formData.business_id,
        first_name: newContactFirstName.trim(),
        last_name: newContactLastName.trim() || null,
      })
      .select()
      .single()
    
    setIsAddingContact(false)
    
    if (!error && data) {
      const { data: refreshedContacts } = await supabase
        .from("contacts")
        .select("*")
        .eq("business_id", formData.business_id)
        .order("first_name", { ascending: true })
      
      setContacts(refreshedContacts || [])
      setFormData({
        ...formData,
        contact_id: data.id,
        contact_name: `${data.first_name} ${data.last_name || ""}`.trim(),
      })
      setNewContactFirstName("")
      setNewContactLastName("")
      setAddContactOpen(false)
    }
  }

  // Reset form when dialog opens to guarantee clean state
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      // Reset all form fields to empty defaults when opening
      setFormData({
        name: "",
        description: "",
        business_id: "none",
        business_name: "",
        contact_id: "none",
        contact_name: "",
        estimated_value: "",
        status: "needed",
        owner_id: "",
        package_id: defaultPackageId || "",
        notes: "",
      })
      // Reset related state
      setContacts([])
      setBusinesses([])
      setOrgId(null)
      // Reset inline dialog states
      setNewBusinessName("")
      setNewBusinessCategory("")
      setNewContactFirstName("")
      setNewContactLastName("")
      setAddBusinessOpen(false)
      setAddContactOpen(false)
      setBusinessPopoverOpen(false)
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
    const businessId = formData.business_id !== "none" ? formData.business_id : null
    const contactId = formData.contact_id !== "none" ? formData.contact_id : null

    const { error } = await supabase.from("items").insert({
      event_id: eventId,
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      business_id: businessId,
      business_name: formData.business_name.trim() || null,
      contact_id: contactId,
      contact_name: formData.contact_name.trim() || null,
      donor_name: formData.business_name.trim() || null, // backwards compat
      estimated_value: formData.estimated_value ? Number(formData.estimated_value) : null,
      status: formData.status,
      owner_id: ownerId,
      owner_name: ownerName,
      package_id: packageId,
      notes: formData.notes.trim() || null,
    })

    setIsSubmitting(false)

    if (!error) {
      setFormData({
        name: "",
        description: "",
        business_id: "none",
        business_name: "",
        contact_id: "none",
        contact_name: "",
        estimated_value: "",
        status: "needed",
        owner_id: "",
        package_id: "",
        notes: "",
      })
      setContacts([])
      setOpen(false)
      onItemAdded()
    }
  }

  return (
    <>
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
                  <FieldLabel htmlFor="add-business">Business</FieldLabel>
                  <Popover open={businessPopoverOpen} onOpenChange={setBusinessPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="add-business"
                        variant="outline"
                        role="combobox"
                        aria-expanded={businessPopoverOpen}
                        className="w-full justify-between font-normal"
                        disabled={loadingBusinesses}
                      >
                        {loadingBusinesses 
                          ? "Loading..." 
                          : formData.business_id !== "none"
                            ? businesses.find(b => b.id === formData.business_id)?.name || "Select business"
                            : "Select business"
                        }
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Search businesses..." />
                        <CommandList>
                          <CommandEmpty>No business found.</CommandEmpty>
                          <CommandGroup>
                            {formData.business_id !== "none" && (
                              <CommandItem onSelect={clearBusiness}>
                                <span className="text-muted-foreground">Clear selection</span>
                              </CommandItem>
                            )}
                            {businesses.map((business) => (
                              <CommandItem
                                key={business.id}
                                value={business.name}
                                onSelect={() => handleBusinessSelect(business.id)}
                              >
                                <Check
                                  className={`mr-2 h-4 w-4 ${formData.business_id === business.id ? "opacity-100" : "opacity-0"}`}
                                />
                                {business.name}
                              </CommandItem>
                            ))}
                            <CommandItem 
                              onSelect={() => handleBusinessSelect("add_new")}
                              className="text-primary"
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Add New Business
                            </CommandItem>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </Field>
                
                <Field>
                  <FieldLabel htmlFor="add-contact">Contact</FieldLabel>
                  <Select
                    value={formData.contact_id}
                    onValueChange={handleContactChange}
                    disabled={formData.business_id === "none" || loadingContacts}
                  >
                    <SelectTrigger id="add-contact">
                      <SelectValue 
                        placeholder={
                          formData.business_id === "none" 
                            ? "Select business first" 
                            : loadingContacts 
                              ? "Loading..." 
                              : "Select contact"
                        } 
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Contact</SelectItem>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name || ""}
                        </SelectItem>
                      ))}
                      {formData.business_id !== "none" && (
                        <SelectItem value="add_new" className="text-primary">
                          <span className="flex items-center gap-1">
                            <Plus className="h-3 w-3" />
                            Add New Contact
                          </span>
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
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
              <Field>
                <FieldLabel htmlFor="notes">Notes</FieldLabel>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Any additional context, instructions, or details about this item..."
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
                Add Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Business Dialog */}
      <Dialog open={addBusinessOpen} onOpenChange={setAddBusinessOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Business</DialogTitle>
            <DialogDescription>
              Create a new business to associate with this item.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Field>
              <FieldLabel htmlFor="new-add-business-name">Business Name *</FieldLabel>
              <Input
                id="new-add-business-name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="Enter business name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-add-business-category">Category</FieldLabel>
              <Input
                id="new-add-business-category"
                value={newBusinessCategory}
                onChange={(e) => setNewBusinessCategory(e.target.value)}
                placeholder="e.g., Restaurant, Retail, Services"
              />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBusinessOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddBusiness} disabled={isAddingBusiness || !newBusinessName.trim()}>
              {isAddingBusiness ? <Spinner className="mr-2" /> : null}
              Add Business
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Contact Dialog */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Contact</DialogTitle>
            <DialogDescription>
              Create a new contact for the selected business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Field>
                <FieldLabel htmlFor="new-add-contact-first-name">First Name *</FieldLabel>
                <Input
                  id="new-add-contact-first-name"
                  value={newContactFirstName}
                  onChange={(e) => setNewContactFirstName(e.target.value)}
                  placeholder="First name"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-add-contact-last-name">Last Name</FieldLabel>
                <Input
                  id="new-add-contact-last-name"
                  value={newContactLastName}
                  onChange={(e) => setNewContactLastName(e.target.value)}
                  placeholder="Last name"
                />
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddContactOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddContact} disabled={isAddingContact || !newContactFirstName.trim()}>
              {isAddingContact ? <Spinner className="mr-2" /> : null}
              Add Contact
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
