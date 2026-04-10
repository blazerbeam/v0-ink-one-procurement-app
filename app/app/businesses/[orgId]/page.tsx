"use client"

import { use } from "react"
import { Businesses } from "@/components/businesses"

export default function BusinessesPage({ 
  params 
}: { 
  params: Promise<{ orgId: string }> 
}) {
  const { orgId } = use(params)
  
  return <Businesses orgId={orgId} />
}
