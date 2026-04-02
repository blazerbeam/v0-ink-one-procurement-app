"use client"

import { useState, useCallback, useRef } from "react"
import { Pencil } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { Item, SignupPage } from "@/lib/types"

interface EditSignupPageDialogProps {
  signupPage: SignupPage
  items: Item[]
  onPageUpdated: () => void
  trigger?: React.ReactNode
}

export function EditSignupPageDialog({ 
  signupPage,
  items,
  onPageUpdated,
  trigger,
}: EditSignupPageDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    title: signupPage.title,
    message: signupPage.message || "",
    allow_open_donations: signupPage.allow_open_donations,
  })

  // Track if we've loaded the items to prevent re-loading
  const hasLoadedRef = useRef(false)

  // Filter to only show items with "needed" status
  const availableItems = items.filter(item => item.status === "needed")

  const loadSelectedItems = useCallback(async () => {
    if (hasLoadedRef.current) return
    
    setIsLoading(true)
    hasLoadedRef.current = true
    
    const supabase = createClient()
    const { data } = await supabase
      .from("signup_page_items")
      .select("item_id")
      .eq("signup_page_id", signupPage.id)

    if (data) {
      setSelectedItemIds(data.map(row => row.item_id))
    }
    setIsLoading(false)
  }, [signupPage.id])

  const handleSelectAll = useCallback(() => {
    const neededIds = items.filter(item => item.status === "needed").map(item => item.id)
    setSelectedItemIds(neededIds)
  }, [items])

  const handleDeselectAll = useCallback(() => {
    setSelectedItemIds([])
  }, [])

  const toggleItem = useCallback((itemId: string) => {
    setSelectedItemIds(prev => 
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    )
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("signup_pages")
      .update({
        title: formData.title.trim(),
        message: formData.message.trim() || null,
        allow_open_donations: formData.allow_open_donations,
        updated_at: new Date().toISOString(),
      })
      .eq("id", signupPage.id)

    if (!error) {
      await supabase
        .from("signup_page_items")
        .delete()
        .eq("signup_page_id", signupPage.id)

      if (selectedItemIds.length > 0) {
        const itemInserts = selectedItemIds.map(itemId => ({
          signup_page_id: signupPage.id,
          item_id: itemId,
        }))
        await supabase.from("signup_page_items").insert(itemInserts)
      }

      onPageUpdated()
      setOpen(false)
    }

    setIsSubmitting(false)
  }

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // Reset form to current signup page values
      setFormData({
        title: signupPage.title,
        message: signupPage.message || "",
        allow_open_donations: signupPage.allow_open_donations,
      })
      hasLoadedRef.current = false
      setOpen(true)
      // Load items after setting open
      loadSelectedItems()
    } else {
      setOpen(false)
      hasLoadedRef.current = false
    }
  }, [signupPage, loadSelectedItems])

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Edit Sign-Up Page</DialogTitle>
            <DialogDescription>
              Update the settings and items for this donation page.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            <div className="grid gap-4 py-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Page Title *</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Spring Gala Donation Sign-Up"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>URL Slug</Label>
                <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                  <span className="text-sm text-muted-foreground">/donate/</span>
                  <span className="text-sm font-mono">{signupPage.slug}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL cannot be changed after creation
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-message">Welcome Message</Label>
                <Textarea
                  id="edit-message"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Thank you for supporting our fundraiser! Please browse available items below and sign up to donate."
                  rows={3}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-allow-open">Allow Open Donations</Label>
                  <p className="text-sm text-muted-foreground">
                    Let donors suggest their own items in addition to selecting from your list
                  </p>
                </div>
                <Checkbox
                  id="edit-allow-open"
                  checked={formData.allow_open_donations}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, allow_open_donations: checked === true }))
                  }
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Items to Include</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAll}
                      className="h-7 text-xs"
                    >
                      Select All
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAll}
                      className="h-7 text-xs"
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedItemIds.length} of {availableItems.length} items selected
                </p>
                <ScrollArea className="h-[200px] rounded-md border p-4">
                  {isLoading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Loading items...
                    </p>
                  ) : availableItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items available. Only items with Needed status will appear here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {availableItems.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer"
                          onClick={() => toggleItem(item.id)}
                        >
                          <Checkbox
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => toggleItem(item.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {item.business_name || item.donor_name || "No donor"}
                              {item.estimated_value && ` · $${item.estimated_value.toLocaleString()}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !formData.title.trim()}>
              {isSubmitting ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
