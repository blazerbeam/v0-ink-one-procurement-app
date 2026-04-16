"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import {
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  History,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  User,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useToast } from "@/hooks/use-toast"
import type { Business, Contact, Event, Item, BusinessOutreach, BusinessOutreachStatus } from "@/lib/types"

interface OutreachTabProps {
  eventId: string
  event: Event
  items: Item[]
  // When set, opens the sheet directly for the business of this item with only this item pre-selected
  preSelectedItemId?: string | null
  onPreSelectClear?: () => void
}

type OutreachFilter = "all" | "not_contacted" | "contacted" | "needs_follow_up"
type Tone = "professional" | "friendly" | "enthusiastic" | "parent"

interface OutreachBusiness {
  business: Business
  items: Item[]
  outreach: BusinessOutreach | null
  contacts: Contact[]
  outreachHistory?: BusinessOutreach[]
}

const loadingMessages = [
  "Crafting the perfect opening...",
  "Adding a personal touch...",
  "Polishing the ask...",
  "Making it compelling...",
  "Adding warmth and sincerity...",
  "Finalizing all four versions...",
]

export function OutreachTab({ eventId, event, items, preSelectedItemId, onPreSelectClear }: OutreachTabProps) {
  const [filter, setFilter] = useState<OutreachFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedBusiness, setSelectedBusiness] = useState<OutreachBusiness | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [addBusinessOpen, setAddBusinessOpen] = useState(false)
  const [preSelectItemIdForSheet, setPreSelectItemIdForSheet] = useState<string | null>(null)

  // Fetch outreach data
  const { data, isLoading, mutate } = useSWR(
    `outreach-${eventId}`,
    async () => {
      const supabase = createClient()

      // Get businesses from items linked to this event
      const businessIdsFromItems = [...new Set(items.filter(i => i.business_id).map(i => i.business_id!))]

      // Get business_outreach records for this event (only the latest round per business)
      const { data: outreachData } = await supabase
        .from("business_outreach")
        .select("*")
        .eq("event_id", eventId)
        .eq("is_latest", true)

      const outreachMap = new Map<string, BusinessOutreach>()
      outreachData?.forEach(o => outreachMap.set(o.business_id, o as BusinessOutreach))

      // Get all outreach records (including history) for businesses with multiple rounds
      const { data: allOutreachData } = await supabase
        .from("business_outreach")
        .select("*")
        .eq("event_id", eventId)
        .order("round_number", { ascending: false })
      
      const historyMap = new Map<string, BusinessOutreach[]>()
      allOutreachData?.forEach(o => {
        if (!historyMap.has(o.business_id)) {
          historyMap.set(o.business_id, [])
        }
        historyMap.get(o.business_id)!.push(o as BusinessOutreach)
      })

      // Get additional business IDs from outreach records (manually added)
      const businessIdsFromOutreach = outreachData?.map(o => o.business_id) || []

      // Combine unique business IDs
      const allBusinessIds = [...new Set([...businessIdsFromItems, ...businessIdsFromOutreach])]

      if (allBusinessIds.length === 0) {
        return { businesses: [] as OutreachBusiness[], allOrgBusinesses: [] as Business[] }
      }

      // Fetch all businesses
      const { data: businessesData } = await supabase
        .from("businesses")
        .select("*")
        .in("id", allBusinessIds)

      // Fetch contacts for all businesses
      const { data: contactsData } = await supabase
        .from("contacts")
        .select("*")
        .in("business_id", allBusinessIds)

      const contactsMap = new Map<string, Contact[]>()
      contactsData?.forEach(c => {
        if (!contactsMap.has(c.business_id)) {
          contactsMap.set(c.business_id, [])
        }
        contactsMap.get(c.business_id)!.push(c as Contact)
      })

      // Build outreach business list and sort alphabetically by name
      const outreachBusinesses: OutreachBusiness[] = (businessesData || [])
        .map(business => ({
          business: business as Business,
          items: items.filter(i => i.business_id === business.id),
          outreach: outreachMap.get(business.id) || null,
          contacts: contactsMap.get(business.id) || [],
          outreachHistory: historyMap.get(business.id) || [],
        }))
        .sort((a, b) => a.business.name.localeCompare(b.business.name))

      // Fetch all org businesses for the add dialog
      const { data: allOrgBusinesses } = await supabase
        .from("businesses")
        .select("*")
        .eq("org_id", event.org_id || "")
        .order("name", { ascending: true })

      return {
        businesses: outreachBusinesses,
        allOrgBusinesses: (allOrgBusinesses || []) as Business[],
      }
    }
  )

  const businesses = data?.businesses || []
  const allOrgBusinesses = data?.allOrgBusinesses || []
  
  // Handle opening from individual item menu
  useEffect(() => {
    if (preSelectedItemId && businesses.length > 0) {
      // Find the business that owns this item
      const item = items.find(i => i.id === preSelectedItemId)
      if (item?.business_id) {
        const businessData = businesses.find(b => b.business.id === item.business_id)
        if (businessData) {
          handleOpenSheet(businessData, preSelectedItemId)
          onPreSelectClear?.()
        }
      }
    }
  }, [preSelectedItemId, businesses, items])

  // Filter businesses
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const filteredBusinesses = businesses.filter(b => {
    // Apply search filter first
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const matchesName = b.business.name.toLowerCase().includes(query)
      if (!matchesName) return false
    }
    
    // Apply status filter
    if (filter === "all") return true
    if (filter === "not_contacted") {
      return !b.outreach || b.outreach.status === "not_contacted"
    }
    if (filter === "contacted") {
      return b.outreach?.status === "contacted"
    }
    if (filter === "needs_follow_up") {
      if (!b.outreach || b.outreach.status !== "contacted") return false
      if (!b.outreach.last_contacted_at) return true
      return new Date(b.outreach.last_contacted_at) < sevenDaysAgo
    }
    return true
  })

  // Count for filters
  const notContactedCount = businesses.filter(b => !b.outreach || b.outreach.status === "not_contacted").length
  const contactedCount = businesses.filter(b => b.outreach?.status === "contacted").length
  const needsFollowUpCount = businesses.filter(b => {
    if (!b.outreach || b.outreach.status !== "contacted") return false
    if (!b.outreach.last_contacted_at) return true
    return new Date(b.outreach.last_contacted_at) < sevenDaysAgo
  }).length

  const handleOpenSheet = (business: OutreachBusiness, preSelectItemId?: string) => {
    setSelectedBusiness(business)
    setPreSelectItemIdForSheet(preSelectItemId || null)
    setSheetOpen(true)
  }

  const handleAddBusiness = async (businessId: string) => {
    const supabase = createClient()
    
    // Create business_outreach record
    await supabase.from("business_outreach").insert({
      org_id: event.org_id,
      event_id: eventId,
      business_id: businessId,
      status: "not_contacted",
      round_number: 1,
      is_latest: true,
    })

    setAddBusinessOpen(false)
    mutate()
  }

  // Get businesses not already in the outreach list
  const availableBusinesses = allOrgBusinesses.filter(
    b => !businesses.some(ob => ob.business.id === b.id)
  )

  const getStatusBadge = (outreach: BusinessOutreach | null) => {
    if (!outreach || outreach.status === "not_contacted") {
      return <Badge variant="secondary" className="bg-gray-100 text-gray-700 border-gray-200">Not Contacted</Badge>
    }
    if (outreach.status === "contacted") {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-700 border-blue-200">Contacted</Badge>
    }
    if (outreach.status === "confirmed") {
      return <Badge variant="secondary" className="bg-teal-100 text-teal-700 border-teal-200">Confirmed</Badge>
    }
    if (outreach.status === "declined") {
      return <Badge variant="secondary" className="bg-red-100 text-red-700 border-red-200">Declined</Badge>
    }
    return null
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  // Check if business has generated emails
  const hasGeneratedEmails = (outreach: BusinessOutreach | null): boolean => {
    if (!outreach) return false
    const o = outreach as BusinessOutreach & {
      generated_body_professional?: string | null
      generated_body_friendly?: string | null
      generated_body_enthusiastic?: string | null
      generated_body_parent?: string | null
    }
    return !!(o.generated_body_professional || o.generated_body_friendly || o.generated_body_enthusiastic || o.generated_body_parent)
  }

  // Check if business has saved drafts (edited versions)
  const hasSavedDrafts = (outreach: BusinessOutreach | null): boolean => {
    if (!outreach) return false
    const o = outreach as BusinessOutreach & {
      edited_body_professional?: string | null
      edited_body_friendly?: string | null
      edited_body_enthusiastic?: string | null
      edited_body_parent?: string | null
    }
    return !!(o.edited_body_professional || o.edited_body_friendly || o.edited_body_enthusiastic || o.edited_body_parent)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-32" />
        </div>
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold">Business Outreach</h3>
          <p className="text-sm text-muted-foreground">
            Contact businesses for donations and sponsorships
          </p>
        </div>
        <Popover open={addBusinessOpen} onOpenChange={setAddBusinessOpen}>
          <PopoverTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Business
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[300px] p-0" align="end">
            <Command>
              <CommandInput placeholder="Search businesses..." />
              <CommandList>
                <CommandEmpty>No businesses found.</CommandEmpty>
                <CommandGroup>
                  {availableBusinesses.map(business => (
                    <CommandItem
                      key={business.id}
                      value={business.name}
                      onSelect={() => handleAddBusiness(business.id)}
                    >
                      <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      <span>{business.name}</span>
                      {business.category && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {business.category}
                        </Badge>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => setFilter("all")}
        >
          All ({businesses.length})
        </Button>
        <Button
          variant={filter === "not_contacted" ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => setFilter("not_contacted")}
        >
          Not Contacted ({notContactedCount})
        </Button>
        <Button
          variant={filter === "contacted" ? "default" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => setFilter("contacted")}
        >
          Contacted ({contactedCount})
        </Button>
        <Button
          variant={filter === "needs_follow_up" ? "default" : "outline"}
          size="sm"
          className="h-8 text-amber-700 border-amber-300 hover:bg-amber-50"
          onClick={() => setFilter("needs_follow_up")}
        >
          Needs Follow-up ({needsFollowUpCount})
        </Button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search businesses by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Business List */}
      {filteredBusinesses.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <Empty>
              <EmptyMedia variant="icon">
                <Building2 className="h-6 w-6" />
              </EmptyMedia>
              <EmptyTitle>
                {filter === "all" ? "No businesses yet" : "No businesses match this filter"}
              </EmptyTitle>
              <EmptyDescription>
                {filter === "all"
                  ? "Add items with businesses assigned, or manually add businesses to start outreach."
                  : "Try changing the filter or adding more businesses."}
              </EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredBusinesses.map(({ business, items: businessItems, outreach, contacts, outreachHistory }) => {
            const hasGenerated = hasGeneratedEmails(outreach)
            const hasDrafts = hasSavedDrafts(outreach)
            const roundNumber = outreach?.round_number || 1
            const hasMultipleRounds = (outreachHistory?.length || 0) > 1
            
            return (
            <Card
              key={business.id}
              className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors relative overflow-hidden ${
                hasDrafts ? "border-l-4 border-l-green-500" : hasGenerated ? "border-l-4 border-l-blue-500" : ""
              }`}
              onClick={() => handleOpenSheet({ business, items: businessItems, outreach, contacts, outreachHistory })}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {hasGenerated && (
                      <Mail className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    )}
                    {hasDrafts && (
                      <Pencil className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    )}
                    <span className="font-semibold truncate">{business.name}</span>
                    {business.category && (
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {business.category}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2">
                    {contacts.length > 0 && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {contacts[0].first_name} {contacts[0].last_name}
                        {contacts.length > 1 && ` +${contacts.length - 1}`}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {businessItems.length > 0 ? (
                      businessItems.map(item => (
                        <Badge key={item.id} variant="outline" className="text-xs bg-muted/50">
                          {item.name}
                        </Badge>
                      ))
                    ) : (
                      <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-200">
                        Open Ask
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1.5">
                      {roundNumber > 1 && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200">
                          Round {roundNumber}
                        </Badge>
                      )}
                      {getStatusBadge(outreach)}
                    </div>
                    {outreach?.last_contacted_at && (
                      <span className="text-xs text-muted-foreground">
                        {formatDate(outreach.last_contacted_at)}
                      </span>
                    )}
                  </div>
                  <Button size="sm">
                    <Mail className="mr-2 h-4 w-4" />
                    Generate Email
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </Card>
          )}
          )}
        </div>
      )}

      {/* Email Generation Sheet */}
      <OutreachSheet
        open={sheetOpen}
        onOpenChange={(isOpen) => {
          setSheetOpen(isOpen)
          if (!isOpen) {
            setPreSelectItemIdForSheet(null)
          }
        }}
        business={selectedBusiness}
        event={event}
        onUpdate={() => mutate()}
        preSelectItemId={preSelectItemIdForSheet}
      />
    </div>
  )
}

// Outreach Sheet Component
interface OutreachSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  business: OutreachBusiness | null
  event: Event
  onUpdate: () => void
  preSelectItemId?: string | null
}

function OutreachSheet({ open, onOpenChange, business, event, onUpdate, preSelectItemId }: OutreachSheetProps) {
  const { toast } = useToast()
  const [tone, setTone] = useState<Tone>("professional")
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const [status, setStatus] = useState<BusinessOutreachStatus>("not_contacted")
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])
  const [copied, setCopied] = useState(false)
  const [draftSaved, setDraftSaved] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showNewRoundConfirm, setShowNewRoundConfirm] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)
  const [historyItems, setHistoryItems] = useState<Map<string, string[]>>(new Map()) // outreach_id -> item_ids
  const [priorRoundItems, setPriorRoundItems] = useState<Map<string, number[]>>(new Map()) // item_id -> round_numbers
  
  // Track original content to detect unsaved changes
  const [originalSubject, setOriginalSubject] = useState("")
  const [originalBody, setOriginalBody] = useState("")
  
  // Item selection state
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set())

  // Email content state - generated versions
  const [emails, setEmails] = useState<{
    professional: { subject: string; body: string }
    friendly: { subject: string; body: string }
    enthusiastic: { subject: string; body: string }
    parent: { subject: string; body: string }
  } | null>(null)

  // Per-tone edited content from DB
  const [editedEmails, setEditedEmails] = useState<{
    professional: { subject: string; body: string } | null
    friendly: { subject: string; body: string } | null
    enthusiastic: { subject: string; body: string } | null
    parent: { subject: string; body: string } | null
  }>({
    professional: null,
    friendly: null,
    enthusiastic: null,
    parent: null,
  })

  // Current working content (what's shown in the form)
  const [editedSubject, setEditedSubject] = useState("")
  const [editedBody, setEditedBody] = useState("")

  // Load items included in prior rounds for this business
  useEffect(() => {
    if (business?.outreachHistory && business.outreachHistory.length > 0) {
      const loadPriorRoundItems = async () => {
        const supabase = createClient()
        const outreachIds = business.outreachHistory!.map(o => o.id)
        
        const { data } = await supabase
          .from("business_outreach_items")
          .select("outreach_id, item_id")
          .in("outreach_id", outreachIds)
        
        if (data) {
          // Build map of outreach_id -> item_ids for history display
          const historyItemsMap = new Map<string, string[]>()
          // Build map of item_id -> round_numbers for item indicators
          const itemRoundsMap = new Map<string, number[]>()
          
          data.forEach(row => {
            // Update historyItemsMap
            if (!historyItemsMap.has(row.outreach_id)) {
              historyItemsMap.set(row.outreach_id, [])
            }
            historyItemsMap.get(row.outreach_id)!.push(row.item_id)
            
            // Update itemRoundsMap with round numbers from prior (non-latest) rounds
            const outreach = business.outreachHistory!.find(o => o.id === row.outreach_id)
            if (outreach && !outreach.is_latest) {
              if (!itemRoundsMap.has(row.item_id)) {
                itemRoundsMap.set(row.item_id, [])
              }
              if (!itemRoundsMap.get(row.item_id)!.includes(outreach.round_number)) {
                itemRoundsMap.get(row.item_id)!.push(outreach.round_number)
              }
            }
          })
          
          setHistoryItems(historyItemsMap)
          setPriorRoundItems(itemRoundsMap)
        }
      }
      loadPriorRoundItems()
    } else {
      setHistoryItems(new Map())
      setPriorRoundItems(new Map())
    }
  }, [business?.outreachHistory])

  // Reset state when business changes
  useEffect(() => {
    if (business) {
      setTone("professional") // Always default to Professional tone
      setSelectedContactId(business.outreach?.contact_id || business.contacts[0]?.id || null)
      setStatus(business.outreach?.status || "not_contacted")
      
      // Handle item selection based on context
      if (preSelectItemId && business.items.some(i => i.id === preSelectItemId)) {
        // Opened from individual item - pre-select only that item
        setSelectedItemIds(new Set([preSelectItemId]))
      } else if (business.outreach?.id) {
        // Load selected items from business_outreach_items if outreach exists
        const loadSelectedItems = async () => {
          const supabase = createClient()
          const { data } = await supabase
            .from("business_outreach_items")
            .select("item_id")
            .eq("outreach_id", business.outreach!.id)
          
          if (data && data.length > 0) {
            // Use previously selected items
            setSelectedItemIds(new Set(data.map(d => d.item_id)))
          } else {
            // Default: select all items for this business
            setSelectedItemIds(new Set(business.items.map(i => i.id)))
          }
        }
        loadSelectedItems()
      } else {
        // No outreach record yet - default to all items selected
        setSelectedItemIds(new Set(business.items.map(i => i.id)))
      }
      
      // Load saved emails if they exist
      if (business.outreach) {
        const o = business.outreach as BusinessOutreach & {
          edited_subject_professional?: string | null
          edited_body_professional?: string | null
          edited_subject_friendly?: string | null
          edited_body_friendly?: string | null
          edited_subject_enthusiastic?: string | null
          edited_body_enthusiastic?: string | null
          edited_subject_parent?: string | null
          edited_body_parent?: string | null
        }
        
        // Load generated emails
        if (o.generated_body_professional || o.generated_body_friendly || o.generated_body_enthusiastic || o.generated_body_parent) {
          setEmails({
            professional: { subject: o.generated_subject_professional || "", body: o.generated_body_professional || "" },
            friendly: { subject: o.generated_subject_friendly || "", body: o.generated_body_friendly || "" },
            enthusiastic: { subject: o.generated_subject_enthusiastic || "", body: o.generated_body_enthusiastic || "" },
            parent: { subject: o.generated_subject_parent || "", body: o.generated_body_parent || "" },
          })
        } else {
          setEmails(null)
        }
        
        // Load per-tone edited versions
        setEditedEmails({
          professional: (o.edited_subject_professional || o.edited_body_professional)
            ? { subject: o.edited_subject_professional || "", body: o.edited_body_professional || "" }
            : null,
          friendly: (o.edited_subject_friendly || o.edited_body_friendly)
            ? { subject: o.edited_subject_friendly || "", body: o.edited_body_friendly || "" }
            : null,
          enthusiastic: (o.edited_subject_enthusiastic || o.edited_body_enthusiastic)
            ? { subject: o.edited_subject_enthusiastic || "", body: o.edited_body_enthusiastic || "" }
            : null,
          parent: (o.edited_subject_parent || o.edited_body_parent)
            ? { subject: o.edited_subject_parent || "", body: o.edited_body_parent || "" }
            : null,
        })
      } else {
        setEmails(null)
        setEditedEmails({
          professional: null,
          friendly: null,
          enthusiastic: null,
          parent: null,
        })
      }
      
      // Reset working content - will be set by tone effect
      setEditedSubject("")
      setEditedBody("")
    }
  }, [business])

  // Progress animation
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }

    const progressInterval = setInterval(() => {
      setProgress(prev => prev >= 90 ? prev : prev + Math.random() * 8)
    }, 500)

    let messageIndex = 0
    const messageInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % loadingMessages.length
      setLoadingMessage(loadingMessages[messageIndex])
    }, 2000)

    return () => {
      clearInterval(progressInterval)
      clearInterval(messageInterval)
    }
  }, [isGenerating])

  const selectedContact = business?.contacts.find(c => c.id === selectedContactId)
  const currentEmail = emails?.[tone]
  
  // Check if a tone has edits that differ from the generated version
  const isEditedForTone = (checkTone: Tone): boolean => {
    const edited = editedEmails[checkTone]
    const generated = emails?.[checkTone]
    if (!edited || !generated) return false
    return edited.subject !== generated.subject || edited.body !== generated.body
  }
  
  // Check if current working content differs from generated (for showing revert button)
  const hasCurrentEdits = (): boolean => {
    if (!currentEmail) return false
    return editedSubject !== currentEmail.subject || editedBody !== currentEmail.body
  }
  
  // Check if there are unsaved changes (differs from what was loaded)
  const hasUnsavedChanges = (): boolean => {
    return editedSubject !== originalSubject || editedBody !== originalBody
  }
  
  // Handle close with confirmation
  const handleClose = () => {
    if (hasUnsavedChanges()) {
      setShowCloseConfirm(true)
    } else {
      onOpenChange(false)
    }
  }
  
  const handleConfirmClose = () => {
    setShowCloseConfirm(false)
    onOpenChange(false)
  }

  const handleGenerate = async () => {
    if (!business) return

    setIsGenerating(true)
    setProgress(0)
    setLoadingMessage(loadingMessages[0])

    // Get only the selected items
    const selectedItems = business.items.filter(i => selectedItemIds.has(i.id))

    try {
      const response = await fetch("/api/generate-outreach-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: event.org_name,
          mission: event.mission,
          event_name: event.event_name,
          event_date: event.event_date,
          event_location: event.location,
          guest_count: event.guest_count,
          business_name: business.business.name,
          business_category: business.business.category,
          contact_first_name: selectedContact?.first_name || "",
          items: selectedItems.length > 0 ? selectedItems.map(i => i.name) : ["general support"],
        }),
      })

      if (!response.ok) throw new Error("Failed to generate")

      const result = await response.json()
      setProgress(100)
      await new Promise(resolve => setTimeout(resolve, 300))

      const newEmails = {
        professional: result.professional,
        friendly: result.friendly,
        enthusiastic: result.enthusiastic,
        parent: result.parent,
      }
      setEmails(newEmails)

      // Save to database
      await saveEmails(newEmails)
    } catch (error) {
      console.error("Error generating email:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const saveEmails = async (emailsToSave: typeof emails) => {
    if (!business || !emailsToSave) return

    const supabase = createClient()
    
    let outreachId = business.outreach?.id
    
    if (outreachId) {
      // Update existing outreach record
      await supabase.from("business_outreach").update({
        contact_id: selectedContactId,
        status,
        generated_subject_professional: emailsToSave.professional.subject,
        generated_body_professional: emailsToSave.professional.body,
        generated_subject_friendly: emailsToSave.friendly.subject,
        generated_body_friendly: emailsToSave.friendly.body,
        generated_subject_enthusiastic: emailsToSave.enthusiastic.subject,
        generated_body_enthusiastic: emailsToSave.enthusiastic.body,
        generated_subject_parent: emailsToSave.parent.subject,
        generated_body_parent: emailsToSave.parent.body,
      }).eq("id", outreachId)
    } else {
      // Create new outreach record
      const { data: outreachData } = await supabase.from("business_outreach").insert({
        org_id: event.org_id,
        event_id: event.id,
        business_id: business.business.id,
        contact_id: selectedContactId,
        status,
        round_number: 1,
        is_latest: true,
        generated_subject_professional: emailsToSave.professional.subject,
        generated_body_professional: emailsToSave.professional.body,
        generated_subject_friendly: emailsToSave.friendly.subject,
        generated_body_friendly: emailsToSave.friendly.body,
        generated_subject_enthusiastic: emailsToSave.enthusiastic.subject,
        generated_body_enthusiastic: emailsToSave.enthusiastic.body,
        generated_subject_parent: emailsToSave.parent.subject,
        generated_body_parent: emailsToSave.parent.body,
      }).select("id").single()
      
      outreachId = outreachData?.id
    }

    // Save selected items to business_outreach_items
    if (outreachId) {
      // Delete existing items for this outreach
      await supabase.from("business_outreach_items").delete().eq("outreach_id", outreachId)
      
      // Insert new selected items
      if (selectedItemIds.size > 0) {
        const itemsToInsert = Array.from(selectedItemIds).map(itemId => ({
          outreach_id: outreachId,
          item_id: itemId,
        }))
        await supabase.from("business_outreach_items").insert(itemsToInsert)
      }
    }

    onUpdate()
  }

  const handleSaveDraft = async () => {
    if (!business) return

    const supabase = createClient()
    
    // Build update object with only the current tone's edited columns
    const updateData: Record<string, unknown> = {
      contact_id: selectedContactId,
      status,
      edited_at: new Date().toISOString(),
    }
    
    // Set the per-tone edited columns based on current tone
    updateData[`edited_subject_${tone}`] = editedSubject
    updateData[`edited_body_${tone}`] = editedBody
    
    if (business.outreach?.id) {
      // Update existing record
      await supabase.from("business_outreach").update(updateData).eq("id", business.outreach.id)
    } else {
      // Create new record
      await supabase.from("business_outreach").insert({
        ...updateData,
        org_id: event.org_id,
        event_id: event.id,
        business_id: business.business.id,
        round_number: 1,
        is_latest: true,
      })
    }

    // Update local state for per-tone edited emails
    setEditedEmails(prev => ({
      ...prev,
      [tone]: { subject: editedSubject, body: editedBody },
    }))
    
    // Update original to match saved content
    setOriginalSubject(editedSubject)
    setOriginalBody(editedBody)
    
    // Show save feedback
    setDraftSaved(true)
    setTimeout(() => setDraftSaved(false), 2000)
    
    toast({
      title: "Draft saved",
      description: "Your changes have been saved.",
    })
    
    onUpdate()
  }

  const handleRevertToGenerated = async () => {
    if (!business || !currentEmail || !business.outreach?.id) return
    
    // Reset local state to generated version
    setEditedSubject(currentEmail.subject)
    setEditedBody(currentEmail.body)
    setOriginalSubject(currentEmail.subject)
    setOriginalBody(currentEmail.body)
    
    // Clear the per-tone edited columns in DB
    const supabase = createClient()
    const updateData: Record<string, unknown> = {}
    updateData[`edited_subject_${tone}`] = null
    updateData[`edited_body_${tone}`] = null
    
    await supabase.from("business_outreach").update(updateData).eq("id", business.outreach.id)
    
    // Update local edited emails state
    setEditedEmails(prev => ({
      ...prev,
      [tone]: null,
    }))
    
    onUpdate()
  }

  const handleStatusChange = async (newStatus: BusinessOutreachStatus) => {
    if (!business) return
    setStatus(newStatus)

    const supabase = createClient()
    const updateData: Record<string, unknown> = {
      status: newStatus,
    }

    if (newStatus === "contacted") {
      updateData.last_contacted_at = new Date().toISOString()
    }

    if (business.outreach?.id) {
      await supabase.from("business_outreach").update(updateData).eq("id", business.outreach.id)
    } else {
      await supabase.from("business_outreach").insert({
        ...updateData,
        org_id: event.org_id,
        event_id: event.id,
        business_id: business.business.id,
        round_number: 1,
        is_latest: true,
      })
    }
    
    // Map outreach status to item status and update only selected items
    const itemStatusMap: Record<BusinessOutreachStatus, string> = {
      not_contacted: "needed",
      contacted: "contacted",
      confirmed: "confirmed",
      declined: "declined",
    }
    
    const newItemStatus = itemStatusMap[newStatus]
    
    // Update only the items that are in the selected set
    if (selectedItemIds.size > 0) {
      const selectedItemIdsArray = Array.from(selectedItemIds)
      await supabase
        .from("items")
        .update({ status: newItemStatus })
        .in("id", selectedItemIdsArray)
    }
    
    onUpdate()
  }

  const handleCopy = () => {
    if (!editedSubject || !editedBody) return

    navigator.clipboard.writeText(`Subject: ${editedSubject}\n\n${editedBody}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  const handleStartNewRound = async () => {
    if (!business || !business.outreach) return
    
    const supabase = createClient()
    const currentRound = business.outreach.round_number || 1
    
    // Mark current outreach as not latest
    await supabase
      .from("business_outreach")
      .update({ is_latest: false })
      .eq("id", business.outreach.id)
    
    // Create new outreach record for the new round
    await supabase.from("business_outreach").insert({
      org_id: event.org_id,
      event_id: event.id,
      business_id: business.business.id,
      contact_id: selectedContactId,
      status: "not_contacted",
      round_number: currentRound + 1,
      is_latest: true,
    })
    
    // Reset local state
    setEmails(null)
    setEditedEmails({
      professional: null,
      friendly: null,
      enthusiastic: null,
      parent: null,
    })
    setStatus("not_contacted")
    setEditedSubject("")
    setEditedBody("")
    setShowNewRoundConfirm(false)
    
    toast({
      title: "New round started",
      description: `Starting Round ${currentRound + 1} outreach.`,
    })
    
    onUpdate()
  }

  // Sync working content when tone changes - load edited version if exists, otherwise generated
  useEffect(() => {
    const editedForTone = editedEmails[tone]
    let subject = ""
    let body = ""
    
    if (editedForTone) {
      // Load the edited version for this tone
      subject = editedForTone.subject
      body = editedForTone.body
    } else if (currentEmail) {
      // No edited version, load generated
      subject = currentEmail.subject
      body = currentEmail.body
    }
    
    setEditedSubject(subject)
    setEditedBody(body)
    setOriginalSubject(subject)
    setOriginalBody(body)
  }, [tone, currentEmail, editedEmails])

  if (!business) return null

  return (
    <>
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose()
      }
    }}>
      <SheetContent className="w-[520px] sm:max-w-[520px] flex flex-col">
        <SheetHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {business.business.name}
              {business.outreach && business.outreach.round_number > 1 && (
                <Badge variant="outline" className="ml-2 text-xs px-1.5 py-0 h-5 bg-purple-50 text-purple-700 border-purple-200">
                  Round {business.outreach.round_number}
                </Badge>
              )}
            </SheetTitle>
            {business.outreach && emails && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowNewRoundConfirm(true)}
                className="shrink-0"
              >
                <RotateCw className="mr-2 h-3.5 w-3.5" />
                New Round
              </Button>
            )}
          </div>
          <SheetDescription>
            {business.business.category && (
              <Badge variant="secondary" className="mr-2">{business.business.category}</Badge>
            )}
            {business.items.length > 0
              ? business.items.map(i => i.name).join(", ")
              : "Open Ask"}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Item Selection */}
          {business.items.length > 0 && (
            <div className="space-y-3">
              <Label>Items to include in this ask</Label>
              <div className="space-y-2 p-3 bg-muted/50 rounded-lg">
                {business.items.map(item => {
                  const itemPriorRounds = priorRoundItems.get(item.id) || []
                  return (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={selectedItemIds.has(item.id)}
                      onCheckedChange={(checked) => {
                        const newSet = new Set(selectedItemIds)
                        if (checked) {
                          newSet.add(item.id)
                        } else {
                          newSet.delete(item.id)
                        }
                        setSelectedItemIds(newSet)
                      }}
                    />
                    <label
                      htmlFor={`item-${item.id}`}
                      className="text-sm font-medium leading-none cursor-pointer flex-1 flex items-center gap-2"
                    >
                      <span>{item.name}</span>
                      {item.estimated_value && (
                        <span className="text-muted-foreground">
                          ${item.estimated_value.toLocaleString()}
                        </span>
                      )}
                      {itemPriorRounds.length > 0 && (
                        <span className="text-xs text-muted-foreground bg-gray-100 px-1.5 py-0.5 rounded">
                          In Round {itemPriorRounds.sort((a, b) => a - b).join(", ")}
                        </span>
                      )}
                    </label>
                  </div>
                )})}
              </div>
              {selectedItemIds.size === 0 && (
                <p className="text-xs text-amber-600">
                  No items selected. The email will be a general support request.
                </p>
              )}
            </div>
          )}

          {/* Contact Selector */}
          {business.contacts.length > 0 && (
            <div className="space-y-2">
              <Label>Contact</Label>
              <Select value={selectedContactId || ""} onValueChange={setSelectedContactId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select contact" />
                </SelectTrigger>
                <SelectContent>
                  {business.contacts.map(contact => (
                    <SelectItem key={contact.id} value={contact.id}>
                      {contact.first_name} {contact.last_name}
                      {contact.title && ` - ${contact.title}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Status Selector */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => handleStatusChange(v as BusinessOutreachStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_contacted">Not Contacted</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tone Tabs */}
          <div className="space-y-2">
            <Label>Tone</Label>
            <ToggleGroup
              type="single"
              value={tone}
              onValueChange={(v) => v && setTone(v as Tone)}
              className="flex flex-wrap justify-start gap-2"
            >
              <ToggleGroupItem value="professional" className="px-3 py-1.5 text-sm h-auto min-w-[120px] justify-center">
                {isEditedForTone("professional") && <span className="text-green-500 mr-1">●</span>}
                Professional
              </ToggleGroupItem>
              <ToggleGroupItem value="friendly" className="px-3 py-1.5 text-sm h-auto min-w-[120px] justify-center">
                {isEditedForTone("friendly") && <span className="text-green-500 mr-1">●</span>}
                Friendly
              </ToggleGroupItem>
              <ToggleGroupItem value="enthusiastic" className="px-3 py-1.5 text-sm h-auto min-w-[120px] justify-center">
                {isEditedForTone("enthusiastic") && <span className="text-green-500 mr-1">●</span>}
                Enthusiastic
              </ToggleGroupItem>
              <ToggleGroupItem value="parent" className="px-3 py-1.5 text-sm h-auto min-w-[120px] justify-center">
                {isEditedForTone("parent") && <span className="text-green-500 mr-1">●</span>}
                Parent-to-Parent
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Generate Button */}
          {!emails && !isGenerating && (
            <Button onClick={handleGenerate} className="w-full">
              <Mail className="mr-2 h-4 w-4" />
              Generate Email
            </Button>
          )}

          {/* Loading State */}
          {isGenerating && (
            <div className="space-y-3">
              <Progress value={progress} className="h-2" />
              <p className="text-sm text-muted-foreground text-center animate-pulse">
                {loadingMessage}
              </p>
            </div>
          )}

          {/* Email Content */}
          {emails && currentEmail && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={editedSubject}
                  onChange={(e) => setEditedSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Email Body</Label>
                <Textarea
                  id="body"
                  value={editedBody}
                  onChange={(e) => setEditedBody(e.target.value)}
                  rows={12}
                  className="resize-y"
                />
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCopy} className="flex-1">
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Email
                    </>
                  )}
                </Button>
                <Button onClick={handleSaveDraft} className="flex-1" disabled={draftSaved}>
                  {draftSaved ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Saved
                    </>
                  ) : (
                    "Save Draft"
                  )}
                </Button>
              </div>

              {hasCurrentEdits() && (
                <Button variant="ghost" size="sm" onClick={handleRevertToGenerated} className="w-full">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Revert to Generated
                </Button>
              )}

              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate All Tones
              </Button>
            </div>
          )}
          
          {/* Outreach History */}
          {business.outreachHistory && business.outreachHistory.length > 1 && (
            <Collapsible open={historyOpen} onOpenChange={setHistoryOpen} className="pt-4 border-t">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Outreach History ({business.outreachHistory.length} rounds)
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${historyOpen ? "rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                {business.outreachHistory
                  .filter(o => !o.is_latest)
                  .sort((a, b) => b.round_number - a.round_number)
                  .map(outreach => {
                    const isExpanded = expandedHistoryId === outreach.id
                    const itemIds = historyItems.get(outreach.id) || []
                    const includedItems = business.items.filter(i => itemIds.includes(i.id))
                    
                    // Get email content for display
                    const o = outreach as BusinessOutreach & {
                      generated_subject_professional?: string | null
                      generated_body_professional?: string | null
                      generated_subject_friendly?: string | null
                      generated_body_friendly?: string | null
                      generated_subject_enthusiastic?: string | null
                      generated_body_enthusiastic?: string | null
                      generated_subject_parent?: string | null
                      generated_body_parent?: string | null
                    }
                    
                    // Find first available tone with content
                    const availableEmail = o.generated_body_professional 
                      ? { tone: "Professional", subject: o.generated_subject_professional || "", body: o.generated_body_professional }
                      : o.generated_body_friendly
                      ? { tone: "Friendly", subject: o.generated_subject_friendly || "", body: o.generated_body_friendly }
                      : o.generated_body_enthusiastic
                      ? { tone: "Enthusiastic", subject: o.generated_subject_enthusiastic || "", body: o.generated_body_enthusiastic }
                      : o.generated_body_parent
                      ? { tone: "Parent-to-Parent", subject: o.generated_subject_parent || "", body: o.generated_body_parent }
                      : null
                    
                    return (
                    <Card key={outreach.id} className="overflow-hidden">
                      <button
                        onClick={() => setExpandedHistoryId(isExpanded ? null : outreach.id)}
                        className="w-full p-3 text-left hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-muted">
                              Round {outreach.round_number}
                            </Badge>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${
                                outreach.status === "confirmed" ? "bg-teal-100 text-teal-700" :
                                outreach.status === "declined" ? "bg-red-100 text-red-700" :
                                outreach.status === "contacted" ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {outreach.status === "not_contacted" ? "Not Contacted" :
                               outreach.status.charAt(0).toUpperCase() + outreach.status.slice(1)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {outreach.last_contacted_at
                                ? new Date(outreach.last_contacted_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : new Date(outreach.created_at).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })}
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                          </div>
                        </div>
                        
                        {/* Items included tags */}
                        {includedItems.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {includedItems.map(item => (
                              <Badge key={item.id} variant="outline" className="text-xs bg-muted/50">
                                {item.name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </button>
                      
                      {/* Expanded email content */}
                      {isExpanded && availableEmail && (
                        <div className="border-t bg-gray-50 p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">{availableEmail.tone}</Badge>
                            <span className="text-xs text-muted-foreground">Read only</span>
                          </div>
                          <div className="space-y-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Subject</Label>
                              <div className="text-sm bg-white border rounded px-3 py-2 text-muted-foreground">
                                {availableEmail.subject}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Body</Label>
                              <div className="text-sm bg-white border rounded px-3 py-2 text-muted-foreground whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                                {availableEmail.body}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {isExpanded && !availableEmail && (
                        <div className="border-t bg-gray-50 p-4 text-center text-sm text-muted-foreground">
                          No email was generated for this round.
                        </div>
                      )}
                    </Card>
                  )})}
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </SheetContent>
    </Sheet>
    
    <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            Your edits have not been saved. Are you sure you want to close?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirmClose}>
            Close Anyway
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    
    <AlertDialog open={showNewRoundConfirm} onOpenChange={setShowNewRoundConfirm}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Start a new outreach round?</AlertDialogTitle>
          <AlertDialogDescription>
            This will archive the current outreach (Round {business?.outreach?.round_number || 1}) and start a fresh Round {(business?.outreach?.round_number || 1) + 1}. You&apos;ll need to generate new emails for this round.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleStartNewRound}>
            Start New Round
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}
