"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GameHistoryRow from "./game-history-row"
import { Loader2 } from "lucide-react"

export default function ProfileSection() {
  const { userProfile } = useAuth()
  const [gameHistory, setGameHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.uid) {
      const fetchHistory = async () => {
        setLoading(true)
        const history = await getUserSoloMatches(userProfile.uid)
        setGameHistory(history)
        setLoading(false)
      }
      fetchHistory()
    }
  }, [userProfile?.uid])

  const getRatingFor = (lang: string) => {
    try {
      return (userProfile as any)?.languageRatings?.[lang] ?? 400
    } catch {
      return 400
    }
  }

  const stats = {
    totalGames: gameHistory.length,
    totalWins: gameHistory.filter((g) => g.score > 0).length, // This is a simplification, win condition may vary
    totalLosses: gameHistory.filter((g) => g.score === 0).length, // This is a simplification
  averageAccuracy: gameHistory.length > 0 ? gameHistory.reduce((acc, g) => acc + (g.accuracy ?? 0), 0) / gameHistory.length : 0,
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={userProfile?.profilePicture || "/placeholder-user.jpg"}
            alt={userProfile?.username}
            className="w-24 h-24 rounded-full object-cover"
          />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">{userProfile?.username}</h2>
            <p className="text-muted-foreground">{userProfile?.email}</p>
            <p className="text-sm">{userProfile?.bio || "No bio yet."}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Total Games</p>
            <p className="text-2xl font-bold">{stats.totalGames}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Wins</p>
            <p className="text-2xl font-bold">{stats.totalWins}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Losses</p>
            <p className="text-2xl font-bold">{stats.totalLosses}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-center">
            <p className="text-sm text-muted-foreground">Avg. Accuracy</p>
            <p className="text-2xl font-bold">{stats.averageAccuracy.toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language Ratings</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          {["HTML", "CSS", "JavaScript"].map((lang) => (
            <div key={lang} className="p-4 bg-muted rounded-lg text-center">
              <p className="text-sm text-muted-foreground">{lang}</p>
              <p className="text-2xl font-bold">{(userProfile?.languageRatings as any)?.[lang] || 400}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Games</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : gameHistory.length === 0 ? (
            <p className="text-muted-foreground text-center">No games played yet.</p>
          ) : (
            <div className="space-y-1">
              {gameHistory.map((game) => (
                <GameHistoryRow key={game.id} game={game} currentRating={getRatingFor(game.language)} matchId={game.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}