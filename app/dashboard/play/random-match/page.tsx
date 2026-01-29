"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { joinWaitingPool, leaveWaitingPool, createMatch } from "@/lib/multiplayer-queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, Users } from "lucide-react"

type GameLanguage = "HTML" | "CSS" | "JavaScript"

export default function RandomMatchPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()

  const [language, setLanguage] = useState<GameLanguage>("JavaScript")
  const [searching, setSearching] = useState(false)
  const [waitingPoolId, setWaitingPoolId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Search for opponent
  const handleFindMatch = async () => {
    if (!user || !userProfile) return

    try {
      setSearching(true)
      setError(null)

      // Join waiting pool
      const poolId = await joinWaitingPool(user.uid, userProfile.username, userProfile.languageRatings, language)
      setWaitingPoolId(poolId)

      // Simulate matchmaking with polling every 2 seconds
      const matchInterval = setInterval(async () => {
        try {
          // For production, implement real Firestore listeners
          // For now, auto-create match after 5 seconds for demo
          clearInterval(matchInterval)

          const opponent = {
            userId: "demo_opponent_" + Date.now(),
            username: "RandomPlayer" + Math.floor(Math.random() * 1000),
            eloRating: 1200 + Math.random() * 800,
            profilePicture: "/diverse-avatars.png",
          }

          const matchId = await createMatch({ ...userProfile, userId: user.uid }, opponent, language, "random")

          // Navigate to multiplayer game
          router.push(`/play/random-match/${matchId}`)
        } catch (err) {
          setError("Failed to create match")
          setSearching(false)
        }
      }, 5000)

      // 60 second timeout
      const timeoutId = setTimeout(() => {
        clearInterval(matchInterval)
        setError("No opponent found. Try again later.")
        setSearching(false)
        if (poolId) {
          leaveWaitingPool(poolId)
        }
      }, 60000)

      return () => {
        clearInterval(matchInterval)
        clearTimeout(timeoutId)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find match")
      setSearching(false)
    }
  }

  const handleCancel = async () => {
    if (waitingPoolId) {
      await leaveWaitingPool(waitingPoolId)
    }
    setSearching(false)
    setWaitingPoolId(null)
  }

  if (!user || !userProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <Alert>
          <AlertDescription>Please log in to play</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (searching) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-6 text-center">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Finding Opponent</h2>
              <p className="text-muted-foreground">Waiting for another player to join...</p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>Language: {language}</p>
              <p>Your Rating: {Math.round(userProfile.languageRatings?.overall || 400)}</p>
            </div>
            <Button variant="destructive" onClick={handleCancel} className="w-full">
              Cancel
            </Button>
          </CardContent>
        </Card>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Random Match</h1>
          <p className="text-muted-foreground">Play against a random opponent and compete for rating</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Match Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Select Language</label>
              <div className="grid grid-cols-3 gap-3">
                {["HTML", "CSS", "JavaScript"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang as GameLanguage)}
                    className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                      language === lang
                        ? "bg-primary text-primary-foreground border-2 border-primary"
                        : "bg-card border-2 border-border text-foreground hover:border-primary"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Player Info */}
            <div className="bg-secondary/50 p-4 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-primary" />
                <span className="font-semibold text-foreground">Your Stats</span>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Username: {userProfile.username}</p>
                <p>Current Rating: {Math.round(userProfile.languageRatings?.overall || 400)}</p>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Start Button */}
            <Button onClick={handleFindMatch} disabled={searching} className="w-full py-6 text-lg font-semibold gap-2">
              <Users className="h-5 w-5" />
              Find Match
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
