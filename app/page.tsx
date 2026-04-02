"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Users, RefreshCw, Layers, CheckCircle, Mail, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LandingPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    
    if (!email || !isValidEmail(email)) {
      setError("Please enter a valid email address.")
      return
    }
    
    setSubmitting(true)
    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      
      if (!response.ok) {
        throw new Error("Failed to submit")
      }
      
      setSubmitted(true)
    } catch {
      setError("Something went wrong. Please try again.")
    }
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-green-600 fill-green-600" />
              <span className="text-xl font-bold text-gray-900">inkind.one</span>
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/demo">
                <Button variant="outline" size="sm" className="hidden sm:inline-flex">
                  Try Demo
                </Button>
              </Link>
              <a href="#waitlist">
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
                  Request Access
                </Button>
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight tracking-tight">
            Stop running your auction procurement out of a spreadsheet.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            inKind manages the messy work before the event — sourcing items, tracking outreach, organizing packages, and keeping your team aligned from first ask to final receipt.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a href="#waitlist">
              <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 gap-2">
                Request Early Access
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8">
                Try the Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-amber-50/50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            Sound familiar?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Problem Card 1 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Nobody knows who&apos;s doing what
              </h3>
              <p className="text-gray-600 leading-relaxed">
                &quot;Who reached out to this business?&quot; &quot;Wait, I thought someone else had that.&quot; Duplicate outreach, missed opportunities, and awkward donor experiences.
              </p>
            </div>

            {/* Problem Card 2 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
                <RefreshCw className="h-6 w-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Your plan breaks the second reality hits
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Items come in late. Some don&apos;t come through. New ideas pop up mid-stream. Your spreadsheet is stale before the ink dries.
              </p>
            </div>

            {/* Problem Card 3 */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Layers className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Everything lives somewhere different
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Spreadsheet for items. Email threads for outreach. Notes in people&apos;s heads or texts. The result: things go missing, surprises at the last minute, and a scramble to the finish.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            One system for the whole procurement process
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {/* Solution Card 1 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Clear ownership
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Assign items and packages to volunteers. Everyone knows exactly what they&apos;re responsible for.
              </p>
            </div>

            {/* Solution Card 2 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <RefreshCw className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Flexible packaging
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Packages evolve as donations come in. Move items, create new packages, and adapt in real time.
              </p>
            </div>

            {/* Solution Card 3 */}
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                Single source of truth
              </h3>
              <p className="text-gray-600 leading-relaxed">
                Items, outreach status, donor info, and packages — all in one place. No more spreadsheet archaeology.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            From first ask to final receipt
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "1",
                title: "Set up your event",
                description: "Add your org, event details, and fundraising goal in minutes",
              },
              {
                step: "2",
                title: "Build your packages",
                description: "Create themed auction packages and add target items",
              },
              {
                step: "3",
                title: "Reach out with one click",
                description: "Generate personalized donor outreach emails with AI, assign to volunteers, track every ask",
              },
              {
                step: "4",
                title: "Track everything in real time",
                description: "Know what's confirmed, what's at risk, and what still needs follow-up",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 h-full">
                  <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white font-bold mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="bg-amber-50 rounded-3xl p-8 sm:p-12 text-center">
            <blockquote className="text-xl sm:text-2xl text-gray-800 leading-relaxed mb-6">
              &quot;Procurement was chaos. We had a spreadsheet, but it was out of date almost immediately. This is exactly the system we wished we had.&quot;
            </blockquote>
            <cite className="text-gray-600 not-italic">
              — Jeremy M., Lake Oswego Schools Foundation
            </cite>
          </div>
        </div>
      </section>

      {/* Waitlist / CTA Section */}
      <section id="waitlist" className="py-20 bg-green-600 px-4 sm:px-6 lg:px-8 scroll-mt-16">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Built for the people who make galas happen
          </h2>
          <p className="text-green-100 text-lg mb-8">
            inKind is in early access. Request your spot and we&apos;ll be in touch.
          </p>
          
          {submitted ? (
            <div className="bg-white/10 backdrop-blur rounded-2xl p-8">
              <CheckCircle className="h-12 w-12 text-white mx-auto mb-4" />
              <p className="text-white text-lg font-medium">
                You&apos;re on the list! We&apos;ll be in touch soon.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  className="bg-white border-0 h-12 text-gray-900 placeholder:text-gray-500"
                  required
                />
                <Button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-gray-900 hover:bg-gray-800 text-white h-12 px-6 whitespace-nowrap"
                >
                  {submitting ? "Submitting..." : "Request Access"}
                </Button>
              </form>
              {error && (
                <p className="mt-3 text-white/90 text-sm bg-red-500/20 rounded-lg px-4 py-2">
                  {error}
                </p>
              )}
            </div>
          )}
          
          <p className="mt-6 text-green-100 text-sm">
            Already have access?{" "}
            <Link href="/app" className="text-white underline underline-offset-2 hover:no-underline">
              Go to the app →
            </Link>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-gray-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-500 fill-green-500" />
              <span className="text-lg font-bold text-white">inkind.one</span>
            </div>
            <p className="text-gray-400 text-sm text-center">
              In-kind procurement, finally organized.
            </p>
            <div className="flex items-center gap-6">
              <Link href="/demo" className="text-gray-400 hover:text-white text-sm transition-colors">
                Try Demo
              </Link>
              <a href="#waitlist" className="text-gray-400 hover:text-white text-sm transition-colors">
                Request Access
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-gray-800 text-center">
            <p className="text-gray-500 text-sm">
              © 2026 inKind. Made for the volunteers who make it happen.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
