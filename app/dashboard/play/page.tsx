"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export default function PlayPage() {
  const router = useRouter()

  const modes = [
    {
      id: "solo",
      title: "Play Solo",
      description: "Practice and improve your skills in timed or survival mode. Your performance affects your rating.",
      icon: "🎯",
      color: "from-blue-500 to-blue-600",
    },
    {
      id: "friend",
      title: "Play with Friend",
      description: "Challenge a friend to a coding duel. Share a unique link and compete head-to-head.",
      icon: "🤝",
      color: "from-purple-500 to-purple-600",
    },
    {
      id: "random",
      title: "Random Match",
      description: "Get matched with players of similar skill level and compete in real-time.",
      icon: "🎲",
      color: "from-green-500 to-green-600",
    },
  ]

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-foreground">Choose Game Mode</h1>
          <p className="text-lg text-muted-foreground">Select how you want to play and test your skills</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {modes.map((mode) => (
            <Card 
              key={mode.id} 
              className="hover:border-primary/50 transition-all cursor-pointer group relative"
              onClick={() => router.push(`/dashboard/play/${mode.id}/setup`)}
            >
              <CardHeader>
                <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{mode.icon}</div>
                <CardTitle className="flex items-center gap-2">
                  {mode.title}
                  {mode.id === "solo" && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      Always Rated
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full gap-2 flex items-center justify-center">
                  <Button className="gap-2">
                    Choose Mode <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </main>
  )
}
