"use client"

import { useState, useEffect, useMemo } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { AlertTriangle, Calendar as CalendarIcon, Check, FileText, Settings } from "lucide-react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { Business, Contact, Item, Org } from "@/lib/types"

interface CreateReceiptSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orgId: string
  business: Business
  contacts: Contact[]
  onReceiptCreated: () => void
}

interface ItemWithEvent extends Item {
  event_name: string
}

export function CreateReceiptSheet({
  open,
  onOpenChange,
  orgId,
  business,
  contacts,
  onReceiptCreated,
}: CreateReceiptSheetProps) {
  const { toast } = useToast()
  const supabase = createClient()

  // Form state
  const [selectedContactId, setSelectedContactId] = useState<string>("")
  const [receiptDate, setReceiptDate] = useState<Date>(new Date())
  const [donorName, setDonorName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  // Track receipt ID for upsert pattern - null means new receipt, string means existing draft
  const [existingReceiptId, setExistingReceiptId] = useState<string | null>(null)

  // Fetch org data for tax ID check
  const { data: org, isLoading: orgLoading } = useSWR<Org | null>(
    open ? `org-${orgId}` : null,
    async () => {
      const { data } = await supabase.from("orgs").select("*").eq("id", orgId).single()
      return data as Org | null
    }
  )

  // Fetch eligible items for this business
  const { data: items, isLoading: itemsLoading } = useSWR<ItemWithEvent[]>(
    open ? `receipt-items-${business.id}` : null,
    async () => {
      const { data } = await supabase
        .from("items")
        .select(`
          *,
          events!inner(event_name)
        `)
        .eq("business_id", business.id)
        .in("status", ["received", "fulfilled"])
        .order("created_at", { ascending: false })
      
      return (data || []).map((item: Record<string, unknown>) => ({
        ...item,
        event_name: (item.events as { event_name: string })?.event_name || "Unknown Event",
      })) as ItemWithEvent[]
    }
  )

  // Reset form when sheet opens
  useEffect(() => {
    if (open) {
      // Set defaults from business and first contact
      const firstContact = contacts[0]
      setSelectedContactId(firstContact?.id || "")
      setDonorName(
        firstContact
          ? `${firstContact.first_name}${firstContact.last_name ? " " + firstContact.last_name : ""}`
          : ""
      )
      setBusinessName(business.name)
      setAddress(business.address || "")
      setEmail(firstContact?.email || "")
      setReceiptDate(new Date())
      // Select all items by default
      if (items) {
        setSelectedItemIds(new Set(items.map((i) => i.id)))
      }
      // Reset existing receipt ID when opening fresh
      setExistingReceiptId(null)
    }
  }, [open, business, contacts, items])

  // Update selected items when items load
  useEffect(() => {
    if (items && selectedItemIds.size === 0) {
      setSelectedItemIds(new Set(items.map((i) => i.id)))
    }
  }, [items, selectedItemIds.size])

  // Update form when contact changes
  const handleContactChange = (contactId: string) => {
    setSelectedContactId(contactId)
    const contact = contacts.find((c) => c.id === contactId)
    if (contact) {
      setDonorName(
        `${contact.first_name}${contact.last_name ? " " + contact.last_name : ""}`
      )
      setEmail(contact.email || "")
    }
  }

  // Group items by event
  const itemsByEvent = useMemo(() => {
    if (!items) return {}
    return items.reduce((acc, item) => {
      const eventName = item.event_name
      if (!acc[eventName]) {
        acc[eventName] = []
      }
      acc[eventName].push(item)
      return acc
    }, {} as Record<string, ItemWithEvent[]>)
  }, [items])

  // Toggle item selection
  const toggleItem = (itemId: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  // Generate preview body text - matches exact .docx format
  const generatePreviewText = () => {
    const selectedItems = items?.filter((item) => selectedItemIds.has(item.id)) || []
    const formattedDate = format(receiptDate, "M/d/yyyy")
    const orgName = org?.legal_name || org?.name || "Organization"
    
    let body = `Date: ${formattedDate}\n\n`
    body += `Donor Name: ${donorName}\n`
    body += `Business Name (if applicable): ${businessName}\n`
    body += `Address: ${address || ""}\n\n`
    body += `Email: ${email || ""}\n\n`
    body += `Thank you for your generous in-kind donation to the ${orgName}, a 501(c)(3) charitable organization. Tax ID: ${org?.tax_id || "N/A"}. This letter serves as your record for tax purposes. ${orgName} did not provide any goods or services in exchange for this donation.\n\n`
    body += `Description of Donated Item(s):\n\n`
    
    selectedItems.forEach((item) => {
      body += `- ${item.name}\n`
    })
    
    body += `\nSincerely,\n\n`
    body += `[Your Name]\n`
    body += orgName
    
    return body
  }

  const hasTaxId = !!org?.tax_id
  const hasEligibleItems = items && items.length > 0
  const canCreateReceipt = hasTaxId && hasEligibleItems && selectedItemIds.size > 0

  const handleSave = async (andDownload: boolean) => {
    if (!canCreateReceipt) return

    setIsSubmitting(true)
    try {
      const bodyText = generatePreviewText()
      const selectedItems = items?.filter((item) => selectedItemIds.has(item.id)) || []

      const receiptData = {
        org_id: orgId,
        business_id: business.id,
        contact_id: selectedContactId || null,
        status: andDownload ? "sent" : "draft",
        receipt_date: format(receiptDate, "yyyy-MM-dd"),
        sent_at: andDownload ? new Date().toISOString() : null,
        snapshot_org_name: org?.legal_name || org?.name || "",
        snapshot_org_tax_id: org?.tax_id || "",
        snapshot_donor_name: donorName,
        snapshot_business_name: businessName,
        snapshot_business_address: address || null,
        snapshot_contact_email: email || null,
        body_text: bodyText,
        updated_at: new Date().toISOString(),
      }

      let receiptId: string

      if (existingReceiptId) {
        // UPDATE existing draft
        const { error: updateError } = await supabase
          .from("receipts")
          .update(receiptData)
          .eq("id", existingReceiptId)

        if (updateError) throw updateError
        receiptId = existingReceiptId

        // Delete existing receipt_items and re-insert
        await supabase
          .from("receipt_items")
          .delete()
          .eq("receipt_id", existingReceiptId)
      } else {
        // INSERT new receipt
        const { data: receipt, error: receiptError } = await supabase
          .from("receipts")
          .insert(receiptData)
          .select()
          .single()

        if (receiptError) throw receiptError
        receiptId = receipt.id
        // Store the ID for future saves
        setExistingReceiptId(receiptId)
      }

      // Insert receipt items
      const receiptItems = selectedItems.map((item) => ({
        receipt_id: receiptId,
        item_id: item.id,
        snapshot_item_name: item.name,
        snapshot_estimated_value: item.estimated_value,
      }))

      const { error: itemsError } = await supabase
        .from("receipt_items")
        .insert(receiptItems)

      if (itemsError) throw itemsError

      // Download if requested
      if (andDownload) {
        window.open(`/api/receipts/${receiptId}/download`, "_blank")
        toast({
          title: "Receipt downloaded",
          description: `Receipt for ${businessName} has been saved and downloaded.`,
        })
        onReceiptCreated()
        onOpenChange(false)
      } else {
        // Keep sheet open on draft save, show toast for 3 seconds
        toast({
          title: "Draft saved.",
          duration: 3000,
        })
        onReceiptCreated()
        // Do NOT close the sheet - keep it open for continued editing
      }
    } catch {
      toast({
        title: "Error",
        description: "Failed to save receipt. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl flex flex-col overflow-hidden">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>Create Receipt</SheetTitle>
          <SheetDescription>
            Generate an in-kind donation receipt for {business.name}.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Tax ID Warning */}
          {orgLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Spinner className="h-4 w-4" />
              <span>Checking organization settings...</span>
            </div>
          ) : !hasTaxId ? (
            <div className="flex items-start gap-3 p-4 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Tax ID Required
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your organization must have a Tax ID (EIN) configured to generate receipts.
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3">
                  <Link href={`/app/events?settings=true`}>
                    <Settings className="mr-2 h-4 w-4" />
                    Go to Organization Settings
                  </Link>
                </Button>
              </div>
            </div>
          ) : null}

          {/* Item Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium">Select Items</h3>
              {items && items.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  {selectedItemIds.size} of {items.length} selected
                </span>
              )}
            </div>

            {itemsLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <Spinner className="h-4 w-4" />
                <span>Loading items...</span>
              </div>
            ) : !hasEligibleItems ? (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No eligible items found</p>
                <p className="text-xs mt-1">
                  Items must have status &quot;Received&quot; or &quot;Fulfilled&quot; to be included in a receipt.
                </p>
              </div>
            ) : (
              <div className="space-y-4 max-h-64 overflow-y-auto border rounded-lg p-3">
                {Object.entries(itemsByEvent).map(([eventName, eventItems]) => (
                  <div key={eventName}>
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                      {eventName}
                    </p>
                    <div className="space-y-2">
                      {eventItems.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedItemIds.has(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <span className="flex-1">{item.name}</span>
                          {item.estimated_value && (
                            <span className="text-sm text-muted-foreground">
                              ${item.estimated_value.toLocaleString()}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            
          </div>

          {/* Recipient Details */}
          <div>
            <h3 className="font-medium mb-3">Recipient Details</h3>
            <FieldGroup>
              {contacts.length > 0 && (
                <Field>
                  <FieldLabel>Contact</FieldLabel>
                  <Select value={selectedContactId} onValueChange={handleContactChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((contact) => (
                        <SelectItem key={contact.id} value={contact.id}>
                          {contact.first_name} {contact.last_name}
                          {contact.title && ` - ${contact.title}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}

              <Field>
                <FieldLabel>Receipt Date</FieldLabel>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !receiptDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {receiptDate ? format(receiptDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={receiptDate}
                      onSelect={(date) => {
                        if (date) {
                          setReceiptDate(date)
                          setCalendarOpen(false)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </Field>

              <Field>
                <FieldLabel>Donor Name</FieldLabel>
                <Input
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                  placeholder="John Doe"
                />
              </Field>

              <Field>
                <FieldLabel>Business Name</FieldLabel>
                <Input
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Acme Corporation"
                />
              </Field>

              <Field>
                <FieldLabel>Address</FieldLabel>
                <Textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State 12345"
                  rows={2}
                />
              </Field>

              <Field>
                <FieldLabel>Email</FieldLabel>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@example.com"
                />
              </Field>
            </FieldGroup>
          </div>

          {/* Preview */}
          {canCreateReceipt && (
            <div>
              <h3 className="font-medium mb-3">Preview</h3>
              <div className="border rounded-lg p-4 bg-muted/30 text-sm whitespace-pre-wrap font-mono">
                <div className="text-center mb-4">
                  <p className="font-bold text-base">{org?.legal_name || org?.name}</p>
                  <p className="text-muted-foreground text-xs">In-Kind Donation Receipt</p>
                </div>
                {generatePreviewText()}
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-shrink-0 px-6 py-4 border-t">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!canCreateReceipt || isSubmitting}
              onClick={() => handleSave(false)}
              className="flex-1"
            >
              {isSubmitting ? <Spinner className="mr-2" /> : null}
              Save as Draft
            </Button>
            <Button
              type="button"
              disabled={!canCreateReceipt || isSubmitting}
              onClick={() => handleSave(true)}
              className="flex-1"
            >
              {isSubmitting ? <Spinner className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
              Save & Download
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
