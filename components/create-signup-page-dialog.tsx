"use client"

import { useState } from "react"
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
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"

interface CreateSignupPageDialogProps {
  eventId: string
  eventName: string
  onPageCreated: () => void
}

export function CreateSignupPageDialog({ 
  eventId, 
  eventName,
  onPageCreated 
}: CreateSignupPageDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    message: "",
    allow_open_donations: false,
  })

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
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    })
  }

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
      .select("slug")
      .single()

    setIsSubmitting(false)

    if (!error && data) {
      setCreatedSlug(data.slug)
      onPageCreated()
    }
  }

  const handleCopyLink = () => {
    const url = `${window.location.origin}/donate/${createdSlug}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleClose = () => {
    setOpen(false)
    // Reset after animation
    setTimeout(() => {
      setCreatedSlug(null)
      setFormData({
        title: "",
        slug: "",
        message: "",
        allow_open_donations: false,
      })
    }, 200)
  }

  const publicUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/donate/${formData.slug || "your-page"}`

  return (
    <Dialog open={open} onOpenChange={(isOpen) => isOpen ? setOpen(true) : handleClose()}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Create Sign-Up Page
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        {createdSlug ? (
          // Success state
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
                  {window.location.origin}/donate/{createdSlug}
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
              <Button variant="outline" onClick={handleClose}>
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
          // Form state
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create Sign-Up Page</DialogTitle>
              <DialogDescription>
                Create a public page where community members can sign up to donate items for {eventName}.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
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
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") })}
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
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
                <Switch
                  id="allow_open"
                  checked={formData.allow_open_donations}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, allow_open_donations: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
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
