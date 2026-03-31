import { Header } from "@/components/header"
import { Dashboard } from "@/components/dashboard"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
