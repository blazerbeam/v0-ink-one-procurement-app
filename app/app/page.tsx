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
    const checkAuth = async () => {
      const supabase = createClient()
      
      console.log("[v0] AppPage: Starting auth check...")
      console.log("[v0] AppPage: Current URL hash:", window.location.hash)
      
      // Listen for auth state changes (handles magic link callback)
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("[v0] AppPage: Auth state changed:", event, session?.user?.email)
        if (event === 'SIGNED_IN' && session) {
          console.log("[v0] AppPage: User signed in via auth state change")
          setIsAuthorized(true)
          setIsLoading(false)
        }
      })
      
      // Check existing Supabase session
      const { data: { session }, error } = await supabase.auth.getSession()
      console.log("[v0] AppPage: getSession result:", { 
        hasSession: !!session, 
        userEmail: session?.user?.email,
        error: error?.message 
      })
      
      if (session) {
        console.log("[v0] AppPage: Found valid Supabase session")
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }
      
      // Check demo password auth
      const demoAuth = localStorage.getItem("demoAuth")
      console.log("[v0] AppPage: demoAuth localStorage value:", demoAuth)
      if (demoAuth === "true") {
        console.log("[v0] AppPage: Found valid demo auth")
        setIsAuthorized(true)
        setIsLoading(false)
        return
      }
      
      console.log("[v0] AppPage: No valid auth found, redirecting to /demo")
      // Not authorized, redirect to demo
      router.push("/demo")
      
      // Cleanup subscription on unmount
      return () => {
        subscription.unsubscribe()
      }
    }
    
    checkAuth()
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
