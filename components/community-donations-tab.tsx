"use client"

// Inline modals - no external dialog components
import { useState } from "react"
import useSWR from "swr"
import {
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  MoreHorizontal,
  Users,
  Gift,
  Pencil,
  Plus,
  X,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { createClient } from "@/lib/supabase/client"
import type { SignupPage, SignupSubmission, Item } from "@/lib/types"

interface CommunityDonationsTabProps {
  eventId: string
  eventName: string
  items: Item[]
}

export function CommunityDonationsTab({ eventId, eventName, items }: CommunityDonationsTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  
  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [createMessage, setCreateMessage] = useState("")
  const [createAllowOpen, setCreateAllowOpen] = useState(true)
  const [createSelectedIds, setCreateSelectedIds] = useState<string[]>([])
  const [createLoading, setCreateLoading] = useState(false)
  const [createdSlug, setCreatedSlug] = useState<string | null>(null)
  const [createCopied, setCreateCopied] = useState(false)
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingPage, setEditingPage] = useState<SignupPage | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editMessage, setEditMessage] = useState("")
  const [editAllowOpen, setEditAllowOpen] = useState(true)
  const [editSelectedIds, setEditSelectedIds] = useState<string[]>([])
  const [editLoading, setEditLoading] = useState(false)

  // Get items with "needed" status
  const neededItems = (items || []).filter(item => item.status === "needed")

  // Fetch signup pages
  const { data: signupPages, mutate: mutatePages } = useSWR<SignupPage[]>(
    `signup-pages-${eventId}`,
    async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("signup_pages")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: false })
      return data || []
    }
  )

  // Fetch submissions for all pages
  const { data: submissions, mutate: mutateSubmissions } = useSWR<SignupSubmission[]>(
    signupPages?.length ? `submissions-${eventId}` : null,
    async () => {
      if (!signupPages?.length) return []
      const supabase = createClient()
      const { data } = await supabase
        .from("signup_submissions")
        .select(`
          *,
          signup_submission_items (
            item_id,
            items (id, name)
          )
        `)
        .in("signup_page_id", signupPages.map(p => p.id))
        .order("created_at", { ascending: false })
      return data || []
    }
  )

  // Create modal handlers
  const handleOpenCreate = () => {
    setCreateTitle("")
    setCreateSlug("")
    setCreateMessage("")
    setCreateAllowOpen(true)
    setCreateSelectedIds(neededItems.map(i => i.id))
    setCreatedSlug(null)
    setCreateCopied(false)
    setShowCreateModal(true)
  }

  const handleCloseCreate = () => {
    setShowCreateModal(false)
  }

  const handleCreateTitleChange = (value: string) => {
    setCreateTitle(value)
    // Auto-generate slug from title
    const slug = value
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50)
    setCreateSlug(slug)
  }

  const handleCreateSubmit = async () => {
    if (!createTitle.trim() || !createSlug.trim()) return
    
    setCreateLoading(true)
    const supabase = createClient()

    // Create the signup page
    const { data: newPage, error } = await supabase
      .from("signup_pages")
      .insert({
        event_id: eventId,
        title: createTitle.trim(),
        slug: createSlug.trim(),
        message: createMessage.trim() || null,
        allow_open_donations: createAllowOpen,
        active: true,
      })
      .select()
      .single()

    if (error || !newPage) {
      setCreateLoading(false)
      return
    }

    // Link selected items to the signup page
    if (createSelectedIds.length > 0) {
      await supabase.from("signup_page_items").insert(
        createSelectedIds.map(itemId => ({
          signup_page_id: newPage.id,
          item_id: itemId,
        }))
      )
    }

    setCreateLoading(false)
    setCreatedSlug(createSlug.trim())
    mutatePages()
  }

  const handleCopyCreatedLink = () => {
    if (!createdSlug) return
    navigator.clipboard.writeText(`${window.location.origin}/donate/${createdSlug}`)
    setCreateCopied(true)
  }

  // Edit modal handlers
  const handleOpenEdit = async (page: SignupPage) => {
    setEditingPage(page)
    setEditTitle(page.title)
    setEditMessage(page.message || "")
    setEditAllowOpen(page.allow_open_donations)
    setEditSelectedIds([])
    setShowEditModal(true)
    
    // Load currently selected items
    const supabase = createClient()
    const { data } = await supabase
      .from("signup_page_items")
      .select("item_id")
      .eq("signup_page_id", page.id)
    
    if (data) {
      setEditSelectedIds(data.map(row => row.item_id))
    }
  }

  const handleCloseEdit = () => {
    setShowEditModal(false)
    setEditingPage(null)
  }

  const handleEditSubmit = async () => {
    if (!editingPage || !editTitle.trim()) return
    
    setEditLoading(true)
    const supabase = createClient()

    // Update the signup page
    await supabase
      .from("signup_pages")
      .update({
        title: editTitle.trim(),
        message: editMessage.trim() || null,
        allow_open_donations: editAllowOpen,
      })
      .eq("id", editingPage.id)

    // Update linked items - delete existing and insert new
    await supabase
      .from("signup_page_items")
      .delete()
      .eq("signup_page_id", editingPage.id)

    if (editSelectedIds.length > 0) {
      await supabase.from("signup_page_items").insert(
        editSelectedIds.map(itemId => ({
          signup_page_id: editingPage.id,
          item_id: itemId,
        }))
      )
    }

    setEditLoading(false)
    setShowEditModal(false)
    setEditingPage(null)
    mutatePages()
  }

  // Other handlers
  const handleCopyLink = (slug: string, pageId: string) => {
    const url = `${window.location.origin}/donate/${slug}`
    navigator.clipboard.writeText(url)
    setCopiedId(pageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleToggleActive = async (page: SignupPage) => {
    const supabase = createClient()
    await supabase
      .from("signup_pages")
      .update({ active: !page.active })
      .eq("id", page.id)
    mutatePages()
  }

  const handleDeletePage = async (pageId: string) => {
    const supabase = createClient()
    await supabase.from("signup_pages").delete().eq("id", pageId)
    mutatePages()
  }

  const handleUpdateSubmissionStatus = async (submissionId: string, status: string) => {
    const supabase = createClient()
    await supabase
      .from("signup_submissions")
      .update({ status })
      .eq("id", submissionId)
    mutateSubmissions()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Confirmed</Badge>
      case "declined":
        return <Badge className="bg-red-100 text-red-700 border-red-200">Declined</Badge>
      default:
        return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
    }
  }

  const pendingCount = submissions?.filter(s => s.status === "pending").length || 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Community Donations</h3>
          <p className="text-sm text-muted-foreground">
            Create public sign-up pages for community members to pledge donations
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Sign-Up Page
        </Button>
      </div>

      {/* Sign-up Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Sign-Up Pages
          </CardTitle>
          <CardDescription>
            Share these links with potential donors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!signupPages?.length ? (
            <Empty>
              <EmptyMedia variant="icon">
                <LinkIcon className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No sign-up pages yet</EmptyTitle>
              <EmptyDescription>
                Create a public page to collect donation pledges from the community
              </EmptyDescription>
            </Empty>
          ) : (
            <div className="space-y-3">
              {signupPages.map((page) => (
                <div
                  key={page.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    page.active ? "bg-background" : "bg-muted/50 opacity-60"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{page.title}</span>
                      {!page.active && (
                        <Badge variant="outline" className="text-xs">Inactive</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        /donate/{page.slug}
                      </code>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyLink(page.slug, page.id)}
                    >
                      {copiedId === page.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={`/donate/${page.slug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleOpenEdit(page)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleActive(page)}>
                          {page.active ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeletePage(page.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submissions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Donation Sign-Ups
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700 border-amber-200 ml-2">
                {pendingCount} pending
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            Community members who have signed up to donate
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submissions?.length ? (
            <Empty>
              <EmptyMedia variant="icon">
                <Gift className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>No sign-ups yet</EmptyTitle>
              <EmptyDescription>
                Share your sign-up page link to start collecting pledges
              </EmptyDescription>
            </Empty>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Donor</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((sub) => {
                  const itemNames = (sub as unknown as { signup_submission_items?: Array<{ items?: { name: string } }> }).signup_submission_items
                    ?.map((si) => si.items?.name)
                    .filter(Boolean)
                    .join(", ")

                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{sub.donor_name}</div>
                          {sub.donor_email && (
                            <div className="text-xs text-muted-foreground">{sub.donor_email}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px] truncate">
                          {itemNames || sub.custom_item_description || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(sub.created_at)}
                      </TableCell>
                      <TableCell>{getStatusBadge(sub.status)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleUpdateSubmissionStatus(sub.id, "confirmed")}
                            >
                              <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateSubmissionStatus(sub.id, "declined")}
                            >
                              <XCircle className="mr-2 h-4 w-4 text-red-600" />
                              Decline
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleUpdateSubmissionStatus(sub.id, "pending")}
                            >
                              <Clock className="mr-2 h-4 w-4 text-amber-600" />
                              Mark Pending
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Modal - Simple div overlay */}
      {showCreateModal && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseCreate() }}
        >
          <div className="bg-background rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">
                  {createdSlug ? "Sign-Up Page Created" : "Create Sign-Up Page"}
                </h2>
                {!createdSlug && (
                  <p className="text-sm text-muted-foreground">
                    Create a public page for {eventName}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseCreate}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {createdSlug ? (
                /* Success state */
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-4">
                    <Check className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium mb-2">Page Created Successfully</h3>
                  <p className="text-muted-foreground mb-6">
                    Share this link with potential donors
                  </p>
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <Input
                      readOnly
                      value={`${typeof window !== "undefined" ? window.location.origin : ""}/donate/${createdSlug}`}
                      className="text-center"
                    />
                    <Button onClick={handleCopyCreatedLink}>
                      {createCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" asChild>
                      <a href={`/donate/${createdSlug}`} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Form */
                <div className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="create-title">Page Title</Label>
                    <Input
                      id="create-title"
                      placeholder="e.g., Spring Fundraiser Donations"
                      value={createTitle}
                      onChange={(e) => handleCreateTitleChange(e.target.value)}
                    />
                  </div>

                  {/* Slug */}
                  <div className="space-y-2">
                    <Label htmlFor="create-slug">URL Slug</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">/donate/</span>
                      <Input
                        id="create-slug"
                        value={createSlug}
                        onChange={(e) => setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                        className="flex-1"
                      />
                    </div>
                  </div>

                  {/* Message */}
                  <div className="space-y-2">
                    <Label htmlFor="create-message">Welcome Message (optional)</Label>
                    <Textarea
                      id="create-message"
                      placeholder="Add a personal message for donors..."
                      value={createMessage}
                      onChange={(e) => setCreateMessage(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Items */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Available Items</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreateSelectedIds(neededItems.map(i => i.id))}
                        >
                          Select All
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setCreateSelectedIds([])}
                        >
                          Deselect All
                        </Button>
                      </div>
                    </div>
                    <div className="border rounded-lg max-h-48 overflow-y-auto">
                      {neededItems.length === 0 ? (
                        <p className="p-4 text-sm text-muted-foreground text-center">
                          No items available. Only items with Needed status will appear here.
                        </p>
                      ) : (
                        <div className="divide-y">
                          {neededItems.map((item) => (
                            <label
                              key={item.id}
                              className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                            >
                              <Checkbox
                                checked={createSelectedIds.includes(item.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setCreateSelectedIds([...createSelectedIds, item.id])
                                  } else {
                                    setCreateSelectedIds(createSelectedIds.filter(id => id !== item.id))
                                  }
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium">{item.name}</div>
                                {item.estimated_value && (
                                  <div className="text-sm text-muted-foreground">
                                    ${item.estimated_value.toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {createSelectedIds.length} of {neededItems.length} items selected
                    </p>
                  </div>

                  {/* Allow open donations */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={createAllowOpen}
                      onCheckedChange={(checked) => setCreateAllowOpen(checked === true)}
                    />
                    <div>
                      <div className="font-medium">Allow open donations</div>
                      <div className="text-sm text-muted-foreground">
                        Let donors suggest items not on the list
                      </div>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              {createdSlug ? (
                <Button onClick={handleCloseCreate}>Done</Button>
              ) : (
                <>
                  <Button variant="outline" onClick={handleCloseCreate}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateSubmit}
                    disabled={createLoading || !createTitle.trim() || !createSlug.trim()}
                  >
                    {createLoading ? "Creating..." : "Create Page"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal - Simple div overlay */}
      {showEditModal && editingPage && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) handleCloseEdit() }}
        >
          <div className="bg-background rounded-lg w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-semibold">Edit Sign-Up Page</h2>
                <p className="text-sm text-muted-foreground">
                  Update {editingPage.title}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={handleCloseEdit}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="edit-title">Page Title</Label>
                  <Input
                    id="edit-title"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>

                {/* Slug (read-only) */}
                <div className="space-y-2">
                  <Label>URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/donate/</span>
                    <Input value={editingPage.slug} disabled className="flex-1 bg-muted" />
                  </div>
                </div>

                {/* Message */}
                <div className="space-y-2">
                  <Label htmlFor="edit-message">Welcome Message (optional)</Label>
                  <Textarea
                    id="edit-message"
                    placeholder="Add a personal message for donors..."
                    value={editMessage}
                    onChange={(e) => setEditMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Available Items</Label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditSelectedIds(neededItems.map(i => i.id))}
                      >
                        Select All
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditSelectedIds([])}
                      >
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {neededItems.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground text-center">
                        No items available. Only items with Needed status will appear here.
                      </p>
                    ) : (
                      <div className="divide-y">
                        {neededItems.map((item) => (
                          <label
                            key={item.id}
                            className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer"
                          >
                            <Checkbox
                              checked={editSelectedIds.includes(item.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setEditSelectedIds([...editSelectedIds, item.id])
                                } else {
                                  setEditSelectedIds(editSelectedIds.filter(id => id !== item.id))
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium">{item.name}</div>
                              {item.estimated_value && (
                                <div className="text-sm text-muted-foreground">
                                  ${item.estimated_value.toLocaleString()}
                                </div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {editSelectedIds.length} of {neededItems.length} items selected
                  </p>
                </div>

                {/* Allow open donations */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <Checkbox
                    checked={editAllowOpen}
                    onCheckedChange={(checked) => setEditAllowOpen(checked === true)}
                  />
                  <div>
                    <div className="font-medium">Allow open donations</div>
                    <div className="text-sm text-muted-foreground">
                      Let donors suggest items not on the list
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t">
              <Button variant="outline" onClick={handleCloseEdit}>
                Cancel
              </Button>
              <Button
                onClick={handleEditSubmit}
                disabled={editLoading || !editTitle.trim()}
              >
                {editLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
