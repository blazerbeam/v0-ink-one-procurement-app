"use client"

import { useState, useEffect } from "react"
import { Copy, Mail, RefreshCw, X, Check } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
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

type Tone = "professional" | "friendly" | "enthusiastic" | "parent-to-parent"

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

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false)
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [copied, setCopied] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(false)

  // Reset and populate form when item/event changes
  useEffect(() => {
    if (item && event) {
      setBusinessName(item.donor_name || "")
      setSpecificAsk(item.name || "")
      setSenderName(ownerName)
      setOrgName(event.org_name || "")
      setMission(event.mission || "")
      setSubject("")
      setBody("")
      setHasGenerated(false)
      setTone("friendly")
    }
  }, [item, event, ownerName])

  const handleGenerate = async () => {
    setIsGenerating(true)
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
          tone: tone,
        }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to generate email")
      }

      const result = await response.json()
      setSubject(result.subject || "")
      setBody(result.body || "")
      setHasGenerated(true)
    } catch (error) {
      console.error("Error generating email:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleCopyEmail = () => {
    const emailText = `Subject: ${subject}\n\n${body}`
    navigator.clipboard.writeText(emailText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleMarkContacted = async () => {
    if (!item) return
    
    const supabase = createClient()
    await supabase
      .from("items")
      .update({ status: "confirmed" })
      .eq("id", item.id)
    
    onUpdate?.()
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Outreach Email
              </SheetTitle>
              {item && (
                <p className="text-sm text-muted-foreground mt-1">
                  {item.name}
                  {item.donor_name && ` - ${item.donor_name}`}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-6 py-6">
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
              <ToggleGroupItem value="parent-to-parent" className="px-3 py-1.5 text-sm">
                Parent-to-Parent
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !businessName || !specificAsk}
            className="w-full bg-primary hover:bg-primary/90"
          >
            {isGenerating ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Generating...
              </>
            ) : (
              "Generate Email"
            )}
          </Button>

          {/* Email Output */}
          {hasGenerated && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="emailBody">Email Body</Label>
                <Textarea
                  id="emailBody"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={10}
                  className="resize-y"
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
                variant="link"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full text-muted-foreground"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
