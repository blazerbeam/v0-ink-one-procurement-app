"use client"

import { useState } from "react"
import { CheckCircle, MapPin, Calendar, Heart, Gift, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from "@/lib/supabase/client"

interface DonatePageClientProps {
  signupPage: {
    id: string
    title: string
    message: string | null
    allow_open_donations: boolean
  }
  event: {
    id: string
    org_name: string
    event_name: string
    mission: string | null
    event_date: string | null
    location: string | null
  }
  availableItems: Array<{
    id: string
    name: string
    description: string | null
    estimated_value: number | null
    status: string
  }>
}

export function DonatePageClient({ signupPage, event, availableItems }: DonatePageClientProps) {
  const [step, setStep] = useState<"select" | "details" | "success">("select")
  const [selectedItems, setSelectedItems] = useState<string[]>([])
  const [customItem, setCustomItem] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    const date = new Date(dateStr + "T00:00:00") // Force consistent timezone parsing
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
  }

  const toggleItem = (itemId: string) => {
    setSelectedItems((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return
    if (selectedItems.length === 0 && !customItem.trim()) return

    setIsSubmitting(true)
    const supabase = createClient()

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from("signup_submissions")
      .insert({
        signup_page_id: signupPage.id,
        donor_name: formData.name.trim(),
        donor_email: formData.email.trim() || null,
        donor_phone: formData.phone.trim() || null,
        custom_item_description: customItem.trim() || null,
        status: "pending",
      })
      .select("id")
      .single()

    if (submissionError || !submission) {
      setIsSubmitting(false)
      return
    }

    // Link selected items to submission
    if (selectedItems.length > 0) {
      await supabase.from("signup_submission_items").insert(
        selectedItems.map((itemId) => ({
          submission_id: submission.id,
          item_id: itemId,
        }))
      )
    }

    setIsSubmitting(false)
    setStep("success")
  }

  const canProceed = selectedItems.length > 0 || (signupPage.allow_open_donations && customItem.trim())

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-green-600" />
            <span className="font-semibold text-lg">{event.org_name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {step === "success" ? (
          // Success state
          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Thank You, {formData.name}!</h2>
              <p className="text-muted-foreground mb-6">
                Your donation sign-up has been submitted. The event organizers will reach out to confirm the details.
              </p>
              <div className="bg-white dark:bg-background rounded-lg p-4 text-left space-y-2">
                <p className="text-sm">
                  <span className="font-medium">Event:</span> {event.event_name}
                </p>
                {selectedItems.length > 0 && (
                  <p className="text-sm">
                    <span className="font-medium">Items:</span>{" "}
                    {availableItems
                      .filter((item) => selectedItems.includes(item.id))
                      .map((item) => item.name)
                      .join(", ")}
                  </p>
                )}
                {customItem && (
                  <p className="text-sm">
                    <span className="font-medium">Custom donation:</span> {customItem}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Event Info */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold mb-2">{signupPage.title}</h1>
              <p className="text-lg text-muted-foreground mb-4">{event.event_name}</p>
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {event.event_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(event.event_date)}
                  </span>
                )}
                {event.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {event.location}
                  </span>
                )}
              </div>

              {signupPage.message && (
                <p className="mt-4 text-muted-foreground">{signupPage.message}</p>
              )}

              {event.mission && (
                <Card className="mt-4 bg-amber-50/50 dark:bg-amber-950/20 border-amber-200">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-sm italic">&quot;{event.mission}&quot;</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {step === "select" ? (
              // Step 1: Select items
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-green-600" />
                      Available Items to Donate
                    </CardTitle>
                    <CardDescription>
                      Select one or more items you&apos;d like to donate
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {availableItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        All items have been claimed! Thank you to our generous donors.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {availableItems.map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                              selectedItems.includes(item.id)
                                ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                                : "border-border hover:border-green-300 hover:bg-green-50/50"
                            }`}
                          >
                            <Checkbox
                              checked={selectedItems.includes(item.id)}
                              onCheckedChange={() => toggleItem(item.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium">{item.name}</span>
                                {item.estimated_value && (
                                  <span className="text-sm text-muted-foreground">
                                    ~${item.estimated_value.toLocaleString()}
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                  {item.description}
                                </p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {signupPage.allow_open_donations && (
                  <Card className="mt-4">
                    <CardHeader>
                      <CardTitle className="text-base">Or Suggest Your Own</CardTitle>
                      <CardDescription>
                        Have something else you&apos;d like to donate?
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={customItem}
                        onChange={(e) => setCustomItem(e.target.value)}
                        placeholder="Describe what you'd like to donate..."
                        rows={2}
                      />
                    </CardContent>
                  </Card>
                )}

                <div className="mt-6 flex justify-end">
                  <Button
                    size="lg"
                    disabled={!canProceed}
                    onClick={() => setStep("details")}
                  >
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : (
              // Step 2: Contact details
              <form onSubmit={handleSubmit}>
                <Card>
                  <CardHeader>
                    <CardTitle>Your Information</CardTitle>
                    <CardDescription>
                      How can we reach you to coordinate the donation?
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Your name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="you@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="mt-4 bg-muted/50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Donation Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {selectedItems.map((itemId) => {
                        const item = availableItems.find((i) => i.id === itemId)
                        return item ? (
                          <li key={itemId} className="flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            {item.name}
                          </li>
                        ) : null
                      })}
                      {customItem && (
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          Custom: {customItem}
                        </li>
                      )}
                    </ul>
                  </CardContent>
                </Card>

                <div className="mt-6 flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("select")}
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmitting || !formData.name.trim()}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Sign-Up"}
                  </Button>
                </div>
              </form>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 mt-12">
        <div className="max-w-3xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by inkind.one</p>
        </div>
      </footer>
    </div>
  )
}
