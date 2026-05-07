"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Check, Download, Trash2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import type { ReceiptWithItems, ReceiptItem } from "@/lib/types"

interface ReceiptDetailSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiptId: string | null
  onReceiptUpdated: () => void
}

export function ReceiptDetailSheet({
  open,
  onOpenChange,
  receiptId,
  onReceiptUpdated,
}: ReceiptDetailSheetProps) {
  const { toast } = useToast()
  const supabase = createClient()

  // Form state
  const [receiptDate, setReceiptDate] = useState<Date>(new Date())
  const [donorName, setDonorName] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [address, setAddress] = useState("")
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Fetch receipt data
  const { data: receipt, isLoading, mutate } = useSWR<ReceiptWithItems | null>(
    open && receiptId ? `receipt-${receiptId}` : null,
    async () => {
      const { data: receiptData, error: receiptError } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", receiptId)
        .single()

      if (receiptError) throw receiptError

      const { data: itemsData, error: itemsError } = await supabase
        .from("receipt_items")
        .select("*")
        .eq("receipt_id", receiptId)
        .order("created_at", { ascending: true })

      if (itemsError) throw itemsError

      return {
        ...receiptData,
        items: itemsData || [],
      } as ReceiptWithItems
    }
  )

  // Populate form when receipt loads
  useEffect(() => {
    if (receipt) {
      setReceiptDate(new Date(receipt.receipt_date))
      setDonorName(receipt.snapshot_donor_name)
      setBusinessName(receipt.snapshot_business_name)
      setAddress(receipt.snapshot_business_address || "")
      setEmail(receipt.snapshot_contact_email || "")
    }
  }, [receipt])

  const isSent = receipt?.status === "sent"
  const totalValue = receipt?.items?.reduce(
    (sum, item) => sum + (item.snapshot_estimated_value || 0),
    0
  ) || 0

  // Generate body text for updates (preserving snapshot data for items)
  const generateBodyText = () => {
    if (!receipt) return ""
    
    const formattedDate = format(receiptDate, "MMMM d, yyyy")
    
    let body = `This letter acknowledges the generous in-kind donation received from ${donorName}${businessName ? ` on behalf of ${businessName}` : ""} on ${formattedDate}.\n\n`
    body += `Items donated:\n`
    
    receipt.items.forEach((item: ReceiptItem) => {
      const valueStr = item.snapshot_estimated_value
        ? ` (estimated value: $${item.snapshot_estimated_value.toLocaleString()})`
        : ""
      body += `- ${item.snapshot_item_name}${valueStr}\n`
    })
    
    body += `\nTotal estimated value: $${totalValue.toLocaleString()}\n\n`
    body += `No goods or services were provided in exchange for this donation.\n\n`
    body += `${receipt.snapshot_org_name}\n`
    body += `EIN: ${receipt.snapshot_org_tax_id}`
    
    return body
  }

  const handleSave = async (andDownload: boolean) => {
    if (!receipt || isSent) return

    setIsSubmitting(true)
    try {
      const bodyText = generateBodyText()

      const { error } = await supabase
        .from("receipts")
        .update({
          receipt_date: format(receiptDate, "yyyy-MM-dd"),
          status: andDownload ? "sent" : "draft",
          sent_at: andDownload ? new Date().toISOString() : null,
          snapshot_donor_name: donorName,
          snapshot_business_name: businessName,
          snapshot_business_address: address || null,
          snapshot_contact_email: email || null,
          body_text: bodyText,
        })
        .eq("id", receipt.id)

      if (error) throw error

      toast({
        title: andDownload ? "Receipt sent and downloaded" : "Receipt saved",
        description: `Receipt for ${businessName} has been ${andDownload ? "finalized" : "updated"}.`,
      })

      // Download if requested
      if (andDownload) {
        window.open(`/api/receipts/${receipt.id}/download`, "_blank")
      }

      mutate()
      onReceiptUpdated()
      if (andDownload) {
        onOpenChange(false)
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

  const handleDelete = async () => {
    if (!receipt) return

    setIsSubmitting(true)
    try {
      // Delete receipt items first
      await supabase
        .from("receipt_items")
        .delete()
        .eq("receipt_id", receipt.id)

      // Delete receipt
      const { error } = await supabase
        .from("receipts")
        .delete()
        .eq("id", receipt.id)

      if (error) throw error

      toast({
        title: "Receipt deleted",
        description: "The receipt has been permanently deleted.",
      })

      onReceiptUpdated()
      onOpenChange(false)
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete receipt. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
      setDeleteDialogOpen(false)
    }
  }

  const handleDownload = () => {
    if (!receipt) return
    window.open(`/api/receipts/${receipt.id}/download`, "_blank")
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl flex flex-col overflow-hidden">
          <SheetHeader className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <SheetTitle>Receipt Details</SheetTitle>
              {receipt && (
                <Badge variant={isSent ? "default" : "secondary"}>
                  {isSent ? "Sent" : "Draft"}
                </Badge>
              )}
            </div>
            <SheetDescription>
              {isSent
                ? `Sent on ${receipt?.sent_at ? format(new Date(receipt.sent_at), "PPP") : "N/A"}`
                : "Edit receipt details or mark as sent."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner className="h-6 w-6" />
              </div>
            ) : receipt ? (
              <>
                {/* Organization Info (read-only) */}
                <div className="p-4 rounded-lg border bg-muted/30">
                  <p className="font-medium">{receipt.snapshot_org_name}</p>
                  <p className="text-sm text-muted-foreground">
                    EIN: {receipt.snapshot_org_tax_id}
                  </p>
                </div>

                {/* Recipient Details */}
                <div>
                  <h3 className="font-medium mb-3">Recipient Details</h3>
                  <FieldGroup>
                    <Field>
                      <FieldLabel>Receipt Date</FieldLabel>
                      {isSent ? (
                        <Input
                          value={format(receiptDate, "PPP")}
                          disabled
                          className="bg-muted"
                        />
                      ) : (
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
                      )}
                    </Field>

                    <Field>
                      <FieldLabel>Donor Name</FieldLabel>
                      <Input
                        value={donorName}
                        onChange={(e) => setDonorName(e.target.value)}
                        disabled={isSent}
                        className={isSent ? "bg-muted" : ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Business Name</FieldLabel>
                      <Input
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        disabled={isSent}
                        className={isSent ? "bg-muted" : ""}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Address</FieldLabel>
                      <Textarea
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isSent}
                        className={isSent ? "bg-muted" : ""}
                        rows={2}
                      />
                    </Field>

                    <Field>
                      <FieldLabel>Email</FieldLabel>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isSent}
                        className={isSent ? "bg-muted" : ""}
                      />
                    </Field>
                  </FieldGroup>
                </div>

                {/* Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium">Items</h3>
                    <Badge variant="secondary">
                      Total: ${totalValue.toLocaleString()}
                    </Badge>
                  </div>
                  <div className="space-y-2 border rounded-lg p-3">
                    {receipt.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <span>{item.snapshot_item_name}</span>
                        {item.snapshot_estimated_value && (
                          <span className="text-sm text-muted-foreground">
                            ${item.snapshot_estimated_value.toLocaleString()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Body Text Preview */}
                <div>
                  <h3 className="font-medium mb-3">Receipt Content</h3>
                  <div className="border rounded-lg p-4 bg-muted/30 text-sm whitespace-pre-wrap font-mono">
                    {receipt.body_text}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          <SheetFooter className="flex-shrink-0 px-6 py-4 border-t">
            {isSent ? (
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download .docx
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isSubmitting}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => handleSave(false)}
                  className="flex-1"
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : null}
                  Save Draft
                </Button>
                <Button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSave(true)}
                  className="flex-1"
                >
                  {isSubmitting ? <Spinner className="mr-2" /> : <Check className="mr-2 h-4 w-4" />}
                  Save & Download
                </Button>
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? This action cannot be undone.
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
    </>
  )
}
