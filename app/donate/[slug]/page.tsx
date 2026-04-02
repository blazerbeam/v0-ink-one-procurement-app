import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { DonatePageClient } from "./donate-page-client"

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function DonatePage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  // Fetch the signup page with event details
  const { data: signupPage, error } = await supabase
    .from("signup_pages")
    .select(`
      *,
      events (
        id,
        org_name,
        event_name,
        mission,
        event_date,
        location
      )
    `)
    .eq("slug", slug)
    .eq("active", true)
    .single()

  if (error || !signupPage) {
    notFound()
  }

  // Fetch available items (needed/contacted status, not yet claimed via signup)
  const { data: items } = await supabase
    .from("items")
    .select("id, name, description, estimated_value, status")
    .eq("event_id", signupPage.event_id)
    .in("status", ["needed", "contacted"])
    .order("name")

  return (
    <DonatePageClient
      signupPage={signupPage}
      event={signupPage.events}
      availableItems={items || []}
    />
  )
}
