"use client"

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
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
import { CreateSignupPageDialog } from "./create-signup-page-dialog"
import { createClient } from "@/lib/supabase/client"
import type { SignupPage, SignupSubmission } from "@/lib/types"

interface CommunityDonationsTabProps {
  eventId: string
  eventName: string
}

export function CommunityDonationsTab({ eventId, eventName }: CommunityDonationsTabProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
        <CreateSignupPageDialog
          eventId={eventId}
          eventName={eventName}
          onPageCreated={() => mutatePages()}
        />
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
    </div>
  )
}
