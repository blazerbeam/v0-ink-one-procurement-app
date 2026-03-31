"use client"

import { Heart } from "lucide-react"

export function Header() {
  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold text-foreground">inKind</span>
        </div>
        <p className="hidden text-sm text-muted-foreground sm:block">
          Nonprofit Gala Procurement
        </p>
      </div>
    </header>
  )
}
