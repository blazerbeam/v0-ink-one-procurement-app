"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { Header } from "@/components/header"
import { Dashboard } from "@/components/dashboard"
import { createClient } from "@/lib/supabase/client"

export default function AppPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Subscribe to auth state changes (catches async sessions like magic link redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[v0] AppPage: onAuthStateChange fired:", { event, userEmail: session?.user?.email })
      
      if (!isMounted) return
      
      if (session) {
        console.log("[v0] AppPage: Session found via onAuthStateChange, authorizing...")
        setIsAuthorized(true)
        setIsLoading(false)
      }
    })

    // Check for existing session on mount
    const checkInitialAuth = async () => {
      console.log("[v0] AppPage: Checking initial auth...")
      
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log("[v0] AppPage: getSession result:", { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        error: error?.message 
      })

      if (!isMounted) return

      if (session) {
        console.log("[v0] AppPage: Valid Supabase session found")
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      // Fallback: Check demo password auth in localStorage
      const demoAuth = localStorage.getItem("demoAuth")
      console.log("[v0] AppPage: demoAuth localStorage value:", demoAuth)
      
      if (demoAuth === "true") {
        console.log("[v0] AppPage: Valid demo auth found")
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }

      console.log("[v0] AppPage: No valid auth found, redirecting to /demo")
      router.push("/demo")
    }

    checkInitialAuth()

    // Cleanup: unsubscribe from auth state changes on unmount
    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [router])

  if (isLoading || !isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <Heart className="h-8 w-8 text-green-600 fill-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
