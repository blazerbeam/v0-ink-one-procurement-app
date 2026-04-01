"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const DEMO_PASSWORD = "inkind2026"

export default function DemoPage() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  // Check if already authenticated
  useEffect(() => {
    const demoAuth = localStorage.getItem("demoAuth")
    if (demoAuth === "true") {
      router.push("/app")
    } else {
      setIsLoading(false)
    }
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
        
        {/* Back link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have the password?{" "}
          <a href="/#waitlist" className="text-green-600 hover:underline">
            Request access
          </a>
        </p>
      </div>
    </div>
  )
}
