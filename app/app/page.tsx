"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Heart } from "lucide-react"
import { Header } from "@/components/header"
import { Dashboard } from "@/components/dashboard"

export default function AppPage() {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const demoAuth = localStorage.getItem("demoAuth")
    if (demoAuth === "true") {
      setIsAuthorized(true)
    } else {
      router.push("/demo")
    }
    setIsLoading(false)
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
