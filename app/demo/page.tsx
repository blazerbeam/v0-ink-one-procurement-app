"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Heart, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { createClient } from "@/lib/supabase/client"

const DEMO_PASSWORD = "inkind2026"

export default function DemoPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [email, setEmail] = useState("")
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState("")
  const [isSendingEmail, setIsSendingEmail] = useState(false)

  // Check if already authenticated (demo password or Supabase session)
  useEffect(() => {
    const checkAuth = async () => {
      // Check Supabase session first
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        router.push("/app")
        return
      }
      
      // Check demo password auth
      const demoAuth = localStorage.getItem("demoAuth")
      if (demoAuth === "true") {
        router.push("/app")
        return
      }
      
      setIsLoading(false)
    }
    
    checkAuth()
  }, [router])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password === DEMO_PASSWORD) {
      localStorage.setItem("demoAuth", "true")
      router.push("/app")
    } else {
      setError("Incorrect password. Try again.")
    }
  }

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setEmailError("")
    setEmailSent(false)
    
    if (!email) {
      setEmailError("Please enter your email address.")
      return
    }
    
    setIsSendingEmail(true)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/app`,
        },
      })
      
      if (error) {
        setEmailError(error.message)
      } else {
        setEmailSent(true)
      }
    } catch {
      setEmailError("Something went wrong. Please try again.")
    } finally {
      setIsSendingEmail(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse">
          <Heart className="h-8 w-8 text-green-600 fill-green-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Heart className="h-8 w-8 text-green-600 fill-green-600" />
          <span className="text-2xl font-bold text-gray-900">inkind.one</span>
        </div>
        
        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2 text-center">
          Try the Demo
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Enter the demo password to explore inKind with sample data
        </p>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="password"
            placeholder="Enter demo password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            className="h-12 text-center"
            autoFocus
          />
          
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg px-4 py-2">
              {error}
            </p>
          )}
          
          <Button 
            type="submit" 
            className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
          >
            Enter Demo
          </Button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-gray-500">or</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Magic Link Form */}
        <form onSubmit={handleMagicLink} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(""); setEmailSent(false); }}
              className="h-12 pl-10"
            />
          </div>
          
          {emailError && (
            <p className="text-red-600 text-sm text-center bg-red-50 rounded-lg px-4 py-2">
              {emailError}
            </p>
          )}
          
          {emailSent && (
            <p className="text-green-600 text-sm text-center bg-green-50 rounded-lg px-4 py-2">
              Check your email for a sign-in link
            </p>
          )}
          
          <Button 
            type="submit" 
            variant="outline"
            className="w-full h-12 border-gray-300 text-gray-700 hover:bg-gray-50"
            disabled={isSendingEmail}
          >
            {isSendingEmail ? "Sending..." : "Send Magic Link"}
          </Button>
        </form>
        
        {/* Back link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have access?{" "}
          <a href="/#waitlist" className="text-green-600 hover:underline">
            Request access
          </a>
        </p>
      </div>
    </div>
  )
}
