import Link from "next/link"
import { Heart, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <div className="flex items-center gap-2 mb-8">
        <Heart className="h-8 w-8 text-green-600 fill-green-600" />
        <span className="text-2xl font-bold text-gray-900">inkind.one</span>
      </div>
      
      <h1 className="text-3xl font-bold text-gray-900 mb-4 text-center">
        Demo Coming Soon
      </h1>
      
      <p className="text-gray-600 text-center max-w-md mb-8">
        We&apos;re putting the finishing touches on our interactive demo. 
        Check back soon to see inKind in action.
      </p>
      
      <Link href="/">
        <Button variant="outline" className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </div>
  )
}
