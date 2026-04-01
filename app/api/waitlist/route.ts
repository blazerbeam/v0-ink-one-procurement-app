import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Try to insert into a waitlist table if it exists
    // For now, just return success - we can connect to Tally or a DB later
    const { error } = await supabase
      .from("waitlist")
      .insert({ email: email.toLowerCase().trim() })

    if (error) {
      // If table doesn't exist or duplicate, still return success for UX
      console.log("Waitlist insert:", error.message)
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    )
  }
}
