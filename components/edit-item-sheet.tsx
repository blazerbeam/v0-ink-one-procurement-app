"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Item, ItemStatus, Package, Volunteer, Business, Contact, STATUS_LABELS } from "@/lib/types"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Spinner } from "@/components/ui/spinner"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Trash2, Plus, Check, ChevronsUpDown } from "lucide-react"

interface EditItemSheetProps {
  item: Item | null
  packages: Package[]
  volunteers: Volunteer[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate: () => void
}

const statusOptions: ItemStatus[] = ["needed", "contacted", "confirmed", "received", "fulfilled", "declined"]

export function EditItemSheet({
  item,
  packages,
  volunteers,
  open,
  onOpenChange,
  onUpdate,
}: EditItemSheetProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [orgId, setOrgId] = useState<string | null>(null)
  const [loadingBusinesses, setLoadingBusinesses] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  
  // Popover states for searchable dropdowns
  const [businessPopoverOpen, setBusinessPopoverOpen] = useState(false)
  
  // Inline dialog states
  const [addBusinessOpen, setAddBusinessOpen] = useState(false)
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [newBusinessName, setNewBusinessName] = useState("")
  const [newBusinessCategory, setNewBusinessCategory] = useState("")
  const [newContactFirstName, setNewContactFirstName] = useState("")
  const [newContactLastName, setNewContactLastName] = useState("")
  const [isAddingBusiness, setIsAddingBusiness] = useState(false)
  const [isAddingContact, setIsAddingContact] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    business_id: "none",
    business_name: "",
    contact_id: "none",
    contact_name: "",
    estimated_value: "",
    status: "needed" as ItemStatus,
    owner_id: "none",
    package_id: "none",
    notes: "",
  })

  // Fetch org_id from event when sheet opens
  useEffect(() => {
    if (open && item?.event_id) {
      const fetchOrgId = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from("events")
          .select("org_id")
          .eq("id", item.event_id)
          .single()
        
        if (data?.org_id) {
          setOrgId(data.org_id)
        }
      }
      fetchOrgId()
    }
  }, [open, item?.event_id])

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

  // Update form data when item changes - only when sheet is open
  useEffect(() => {
    if (open && item) {
      // Try to match owner_id first, otherwise try to find volunteer by owner_name text
      let ownerId = item.owner_id || "none"
      if (ownerId === "none" && item.owner_name) {
        const matchingVolunteer = volunteers.find(v => {
          const fullName = `${v.first_name || ""} ${v.last_name || ""}`.toLowerCase().trim()
          const ownerNameLower = item.owner_name?.toLowerCase() || ""
          return fullName === ownerNameLower || 
                 (v.first_name || "").toLowerCase() === ownerNameLower ||
                 (v.last_name || "").toLowerCase() === ownerNameLower
        })
        if (matchingVolunteer) {
          ownerId = matchingVolunteer.id
        }
      }

      // Determine business_id - use existing or try to match by name
      let businessId = item.business_id || "none"
      if (businessId === "none" && item.business_name && businesses.length > 0) {
        const matchingBusiness = businesses.find(b => 
          b.name.toLowerCase() === item.business_name?.toLowerCase()
        )
        if (matchingBusiness) {
          businessId = matchingBusiness.id
        }
      }

      setFormData({
        name: item.name || "",
        description: item.description || "",
        business_id: businessId,
        business_name: item.business_name || item.donor_name || "",
        contact_id: item.contact_id || "none",
        contact_name: item.contact_name || "",
        estimated_value: item.estimated_value?.toString() || "",
        status: item.status,
        owner_id: ownerId,
        package_id: item.package_id || "none",
        notes: item.notes || "",
      })
    }
  }, [open, item, volunteers, businesses])

  // When contacts load and we have a contact_id or contact_name, try to pre-select
  useEffect(() => {
    if (contacts.length > 0 && item) {
      let contactId = item.contact_id || "none"
      if (contactId === "none" && item.contact_name) {
        const matchingContact = contacts.find(c => {
          const fullName = `${c.first_name} ${c.last_name || ""}`.toLowerCase().trim()
          return fullName === item.contact_name?.toLowerCase()
        })
        if (matchingContact) {
          contactId = matchingContact.id
        }
      }
      if (contactId !== formData.contact_id) {
        setFormData(prev => ({ ...prev, contact_id: contactId }))
      }
    }
  }, [contacts, item, formData.contact_id])

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
      contact_id: "none", // Clear contact when business changes
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
      // Re-fetch businesses to ensure we have fresh data
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
      // Re-fetch contacts to ensure we have fresh data
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
    const businessId = formData.business_id !== "none" ? formData.business_id : null
    const contactId = formData.contact_id !== "none" ? formData.contact_id : null

    const supabase = createClient()
    const { error } = await supabase
      .from("items")
      .update({
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
      .eq("id", item.id)

    setIsSubmitting(false)

    if (!error) {
      onUpdate()
      onOpenChange(false)
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-md flex flex-col">
          <SheetHeader>
            <SheetTitle>Edit Item</SheetTitle>
            <SheetDescription>
              Update the item details or reassign to a different package.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-6">
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

              <div className="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="business">Business</FieldLabel>
                  <Popover open={businessPopoverOpen} onOpenChange={setBusinessPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="business"
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
                  <FieldLabel htmlFor="contact">Contact</FieldLabel>
                  <Select
                    value={formData.contact_id}
                    onValueChange={handleContactChange}
                    disabled={formData.business_id === "none" || loadingContacts}
                  >
                    <SelectTrigger id="contact">
                      <SelectValue 
                        placeholder={
                          formData.business_id === "none" 
                            ? "Select a business first" 
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
              <FieldLabel htmlFor="new-business-name">Business Name *</FieldLabel>
              <Input
                id="new-business-name"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="Enter business name"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="new-business-category">Category</FieldLabel>
              <Input
                id="new-business-category"
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
                <FieldLabel htmlFor="new-contact-first-name">First Name *</FieldLabel>
                <Input
                  id="new-contact-first-name"
                  value={newContactFirstName}
                  onChange={(e) => setNewContactFirstName(e.target.value)}
                  placeholder="First name"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="new-contact-last-name">Last Name</FieldLabel>
                <Input
                  id="new-contact-last-name"
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
