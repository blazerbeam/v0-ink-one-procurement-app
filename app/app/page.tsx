import { Header } from "@/components/header"
import { Dashboard } from "@/components/dashboard"

export default function AppPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main>
        <Dashboard />
      </main>
    </div>
  )
}
