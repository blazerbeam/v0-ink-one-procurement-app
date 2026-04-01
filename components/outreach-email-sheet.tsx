"use client"

import { useState, useEffect } from "react"
import { Copy, Mail, RefreshCw, Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Item, Event, Volunteer } from "@/lib/types"
import { createClient } from "@/lib/supabase/client"

interface OutreachEmailSheetProps {
  item: Item | null
  event: Event | null
  volunteers: Volunteer[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

type Tone = "professional" | "friendly" | "enthusiastic" | "parentToParent"

const loadingMessages = [
  "Crafting the perfect opening...",
  "Adding a personal touch...",
  "Polishing the ask...",
  "Making it compelling...",
  "Adding warmth and sincerity...",
  "Finalizing all four versions...",
]

interface EmailVersion {
  subject: string
  body: string
}

interface AllEmails {
  professional: EmailVersion
  friendly: EmailVersion
  enthusiastic: EmailVersion
  parentToParent: EmailVersion
}

export function OutreachEmailSheet({
  item,
  event,
  volunteers,
  open,
  onOpenChange,
  onUpdate,
}: OutreachEmailSheetProps) {
  // Get owner volunteer if exists
  const ownerVolunteer = item?.owner_id 
    ? volunteers.find(v => v.id === item.owner_id) 
    : null
  const ownerName = ownerVolunteer 
    ? `${ownerVolunteer.first_name} ${ownerVolunteer.last_name}`
    : item?.owner_name || ""

  // Form state
  const [businessName, setBusinessName] = useState("")
  const [specificAsk, setSpecificAsk] = useState("")
  const [senderName, setSenderName] = useState("")
  const [orgName, setOrgName] = useState("")
  const [mission, setMission] = useState("")
  const [tone, setTone] = useState<Tone>("friendly")

  // Generation state - store all four versions
  const [isGenerating, setIsGenerating] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [allEmails, setAllEmails] = useState<AllEmails | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState(loadingMessages[0])

  // Get current email based on selected tone
  const currentEmail = allEmails ? allEmails[tone] : null

  // Load existing outreach record when panel opens
  useEffect(() => {
    if (!open || !item?.id) return

    const loadExistingOutreach = async () => {
      setIsLoading(true)
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from("outreach")
        .select("*")
        .eq("item_id", item.id)
        .maybeSingle()

      if (!error && data && data.generated_at) {
        // Found existing record with generated emails
        setAllEmails({
          professional: {
            subject: data.email_professional_subject || "",
            body: data.email_professional_body || "",
          },
          friendly: {
            subject: data.email_friendly_subject || "",
            body: data.email_friendly_body || "",
          },
          enthusiastic: {
            subject: data.email_enthusiastic_subject || "",
            body: data.email_enthusiastic_body || "",
          },
          parentToParent: {
            subject: data.email_parenttoparent_subject || "",
            body: data.email_parenttoparent_body || "",
          },
        })
        setGeneratedAt(data.generated_at)
      } else {
        // No existing record
        setAllEmails(null)
        setGeneratedAt(null)
      }
      
      setIsLoading(false)
    }

    loadExistingOutreach()
  }, [open, item?.id])

  // Reset and populate form when item/event changes
  useEffect(() => {
    if (item && event) {
      setBusinessName(item.business_name || item.donor_name || "")
      setSpecificAsk(item.name || "")
      setSenderName(ownerName)
      setOrgName(event.org_name || "")
      setMission(event.mission || "")
      setTone("friendly")
    }
  }, [item, event, ownerName])

  // Progress animation during generation
  useEffect(() => {
    if (!isGenerating) {
      setProgress(0)
      return
    }

    // Progress bar animation - smooth increase
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) return prev
        return prev + Math.random() * 8
      })
    }, 500)

    // Rotating messages every 2 seconds
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

  const saveOutreachToSupabase = async (emails: AllEmails) => {
    if (!item?.id) return

    const supabase = createClient()
    const now = new Date().toISOString()

    await supabase
      .from("outreach")
      .upsert({
        item_id: item.id,
        email_professional_subject: emails.professional.subject,
        email_professional_body: emails.professional.body,
        email_friendly_subject: emails.friendly.subject,
        email_friendly_body: emails.friendly.body,
        email_enthusiastic_subject: emails.enthusiastic.subject,
        email_enthusiastic_body: emails.enthusiastic.body,
        email_parenttoparent_subject: emails.parentToParent.subject,
        email_parenttoparent_body: emails.parentToParent.body,
        generated_at: now,
      }, { onConflict: "item_id" })

    setGeneratedAt(now)
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setProgress(0)
    setLoadingMessage(loadingMessages[0])
    
    try {
      const response = await fetch("/api/generate-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          org_name: orgName,
          mission: mission,
          event_name: event?.event_name || "",
          business_name: businessName,
          specific_ask: specificAsk,
          sender_name: senderName,
          // Organization profile for signature block
          legal_name: event?.legal_name || "",
          org_address: event?.org_address || "",
          tax_id: event?.tax_id || "",
          contact_email: event?.contact_email || "",
          contact_phone: event?.contact_phone || "",
          website: event?.website || "",
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to generate email")
      }

      const result = await response.json()
      
      // Complete the progress bar
      setProgress(100)
      
      // Short delay to show 100% before hiding
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const emails: AllEmails = {
        professional: result.professional || { subject: "", body: "" },
        friendly: result.friendly || { subject: "", body: "" },
        enthusiastic: result.enthusiastic || { subject: "", body: "" },
        parentToParent: result.parentToParent || { subject: "", body: "" },
      }
      
      setAllEmails(emails)
      
      // Save to Supabase
      await saveOutreachToSupabase(emails)
    } catch (error) {
      console.error("Error generating email:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyEmail = () => {
    if (!currentEmail) return
    const emailText = `Subject: ${currentEmail.subject}\n\n${currentEmail.body}`
    navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkContacted = async () => {
    if (!item) return
    
    const supabase = createClient()
    await supabase
      .from("items")
      .update({ status: "contacted" })
      .eq("id", item.id)
    
    onUpdate?.()
    onOpenChange(false)
  }

  const formatGeneratedDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Outreach Email
          </SheetTitle>
          <SheetDescription>
            {item?.name}
            {(item?.business_name || item?.donor_name) && ` - ${item.business_name || item.donor_name}`}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">Loading...</div>
            </div>
          ) : (
            <>
              {/* Context Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business/Donor Name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Enter business or donor name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specificAsk">Specific Ask</Label>
                  <Input
                    id="specificAsk"
                    value={specificAsk}
                    onChange={(e) => setSpecificAsk(e.target.value)}
                    placeholder="e.g., 2 tickets to a home game"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senderName">Your Name</Label>
                  <Input
                    id="senderName"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    placeholder="Your name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orgName">Your Organization</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Organization name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mission">Your Mission</Label>
                  <Textarea
                    id="mission"
                    value={mission}
                    onChange={(e) => setMission(e.target.value)}
                    placeholder="Brief mission statement"
                    rows={3}
                  />
                </div>
              </div>

              {/* Last Generated Date & Tone Selector */}
              {generatedAt && allEmails && (
                <div className="text-xs text-muted-foreground">
                  Last generated: {formatGeneratedDate(generatedAt)}
                </div>
              )}

              {/* Tone Selector */}
              <div className="space-y-2">
                <Label>Tone</Label>
                <ToggleGroup
                  type="single"
                  value={tone}
                  onValueChange={(value) => value && setTone(value as Tone)}
                  className="flex flex-wrap justify-start gap-2"
                >
                  <ToggleGroupItem value="professional" className="px-3 py-1.5 text-sm">
                    Professional
                  </ToggleGroupItem>
                  <ToggleGroupItem value="friendly" className="px-3 py-1.5 text-sm">
                    Friendly
                  </ToggleGroupItem>
                  <ToggleGroupItem value="enthusiastic" className="px-3 py-1.5 text-sm">
                    Enthusiastic
                  </ToggleGroupItem>
                  <ToggleGroupItem value="parentToParent" className="px-3 py-1.5 text-sm">
                    Parent-to-Parent
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>

              {/* Generate/Regenerate Button */}
              {!allEmails && (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating || !businessName || !specificAsk}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {isGenerating ? "Generating..." : "Generate Email"}
                </Button>
              )}

              {/* Loading Progress */}
              {isGenerating && (
                <div className="space-y-3">
                  <Progress value={progress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center animate-pulse">
                    {loadingMessage}
                  </p>
                </div>
              )}

              {/* Email Output */}
              {allEmails && currentEmail && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject Line</Label>
                    <Input
                      id="subject"
                      value={currentEmail.subject}
                      readOnly
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emailBody">Email Body</Label>
                    <Textarea
                      id="emailBody"
                      value={currentEmail.body}
                      readOnly
                      rows={10}
                      className="resize-y bg-muted"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={handleCopyEmail}
                      className="flex-1"
                    >
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
                    <Button
                      onClick={handleMarkContacted}
                      className="flex-1"
                    >
                      Mark as Contacted
                    </Button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={handleGenerate}
                    disabled={isGenerating || !businessName || !specificAsk}
                    className="w-full"
                  >
                    <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                    Regenerate All Tones
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
