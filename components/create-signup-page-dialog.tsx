"use client"

import { useState, useCallback, useRef } from "react"
import { Plus, Link as LinkIcon, Copy, Check, ExternalLink } from "lucide-react"
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
import { Item } from "@/lib/types"

interface CreateSignupPageDialogProps {
  eventId: string
  eventName: string
  items: Item[]
  onPageCreated: () => void
}

const initialFormData = {
  title: "",
  slug: "",
  message: "",
  allow_open_donations: false,
}

export function CreateSignupPageDialog({ 
  eventId, 
  eventName,
  items,
  onPageCreated 
}: CreateSignupPageDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [formData, setFormData] = useState(initialFormData)
  
  // Use ref to track initialization - prevents re-running on every render
  const hasInitializedRef = useRef(false)

  // Filter to only show items with "needed" status
  const availableItems = items.filter(item => item.status === "needed")

  // Generate slug from title
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50)
  }

  const handleTitleChange = (title: string) => {
    setFormData(prev => ({
      ...prev,
      title,
      slug: generateSlug(title),
    }))
  }

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
    if (!formData.title.trim() || !formData.slug.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    const { data, error } = await supabase
      .from("signup_pages")
      .insert({
        event_id: eventId,
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        message: formData.message.trim() || null,
        allow_open_donations: formData.allow_open_donations,
        active: true,
      })
      .select("id, slug")
      .single()

    if (!error && data) {
      if (selectedItemIds.length > 0) {
        const itemInserts = selectedItemIds.map(itemId => ({
          signup_page_id: data.id,
          item_id: itemId,
        }))
        await supabase.from("signup_page_items").insert(itemInserts)
      }

      setCreatedSlug(data.slug)
      onPageCreated()
    }

    setIsSubmitting(false)
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/donate/${createdSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = useCallback((isOpen: boolean) => {
    if (isOpen) {
      // Initialize selection when opening
      const neededIds = items.filter(item => item.status === "needed").map(item => item.id)
      setSelectedItemIds(neededIds)
      hasInitializedRef.current = true
      setOpen(true)
    } else {
      // Clean close - just close, reset happens on next open
      setOpen(false)
      setCreatedSlug(null)
      setCopied(false)
      setSelectedItemIds([])
      setFormData(initialFormData)
      hasInitializedRef.current = false
    }
  }, [items])

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/donate/${formData.slug || "your-page"}`

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Sign-Up Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col">
        {createdSlug ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-600" />
                Sign-Up Page Created
              </DialogTitle>
              <DialogDescription>
                Your community donation page is ready to share.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <LinkIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <code className="text-sm flex-1 truncate">
                  {typeof window !== "undefined" ? window.location.origin : ""}/donate/{createdSlug}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
              <Button asChild>
                <a
                  href={`/donate/${createdSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Preview Page
                </a>
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Create Sign-Up Page</DialogTitle>
              <DialogDescription>
                Create a public page where community members can sign up to donate items for {eventName}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              <div className="grid gap-4 py-4 pr-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Page Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g., Spring Gala Donation Sign-Up"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/donate/</span>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      placeholder="spring-gala-2026"
                      className="flex-1"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Public URL: {publicUrl}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Welcome Message</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                    placeholder="Thank you for supporting our fundraiser! Please browse available items below and sign up to donate."
                    rows={3}
                  />
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="allow_open">Allow Open Donations</Label>
                    <p className="text-sm text-muted-foreground">
                      Let donors suggest their own items in addition to selecting from your list
                    </p>
                  </div>
                  <Checkbox
                    id="allow_open"
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
                    {availableItems.length === 0 ? (
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
              <Button type="submit" disabled={isSubmitting || !formData.title.trim() || !formData.slug.trim()}>
                {isSubmitting ? "Creating..." : "Create Page"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
