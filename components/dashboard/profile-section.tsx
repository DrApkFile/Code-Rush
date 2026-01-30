"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import GameHistoryRow from "./game-history-row"
import { Loader2 } from "lucide-react"

export default function ProfileSection() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalGames: 0,
    totalWins: 0,
    totalLosses: 0,
    averageAccuracy: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile?.uid) {
      const fetchData = async () => {
        setLoading(true)
        try {
          // Fetch only 15 for display
          const recent = await getUserSoloMatches(userProfile.uid, 15)
          setRecentGames(recent)

          // Fetch more for stats (e.g. last 1000) - in a real app this should be a tailored aggregation query
          const allGames = await getUserSoloMatches(userProfile.uid, 1000)

          const calculatedStats = {
            totalGames: allGames.length,
            // A win is defined by gaining rating (ratingChange > 0), not just getting points
            totalWins: allGames.filter((g) => (g.ratingChange || 0) > 0).length,
            // A loss is losing rating (ratingChange < 0)
            totalLosses: allGames.filter((g) => (g.ratingChange || 0) < 0).length,
            averageAccuracy: allGames.length > 0
              ? allGames.reduce((acc, g) => acc + (g.accuracy ?? 0), 0) / allGames.length
              : 0,
          }
          setStats(calculatedStats)
        } catch (error) {
          console.error("Error fetching profile data:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchData()
    }
  }, [userProfile?.uid])

  const getRatingFor = (lang: string) => {
    try {
      return (userProfile as any)?.languageRatings?.[lang] ?? 400
    } catch {
      return 400
    }
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
            <p className="text-sm text-muted-foreground">Overall Accuracy</p>
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
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Games</CardTitle>
          <Button variant="outline" size="sm" onClick={() => router.push("/dashboard/profile/games")}>
            View All Games
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : recentGames.length === 0 ? (
            <p className="text-muted-foreground text-center">No games played yet.</p>
          ) : (
            <div className="space-y-1">
              {recentGames.map((game) => (
                <GameHistoryRow key={game.id} game={game} currentRating={getRatingFor(game.language)} matchId={game.id} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}