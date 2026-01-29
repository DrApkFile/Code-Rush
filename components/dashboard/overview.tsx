"use client"

import { useAuth } from "@/lib/auth-context"
import { useEffect, useState } from "react"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import type { GameSession } from "@/lib/game-queries"
import GameHistoryRow from "./game-history-row"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function DashboardOverview() {
  const { userProfile } = useAuth()
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userProfile?.uid) return
    let mounted = true
    setLoading(true)
    getUserSoloMatches(userProfile.uid, 5)
      .then((h) => {
        if (mounted) setRecent(h)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => void (mounted = false)
  }, [userProfile?.uid])

  const getRatingFor = (lang: string) => {
    try {
      return (userProfile as any)?.languageRatings?.[lang] ?? 400
    } catch {
      return 400
    }
  }

  // Calculate highest language rating
  const getHighestRating = () => {
    if (!userProfile?.languageRatings) return { lang: "JavaScript", rating: 400 }
    const ratings = {
      HTML: userProfile.languageRatings.HTML || 400,
      CSS: userProfile.languageRatings.CSS || 400,
      JavaScript: userProfile.languageRatings.JavaScript || 400,
    }
    let highestLang = "JavaScript"
    let highestRating = ratings.JavaScript
    for (const [lang, rating] of Object.entries(ratings)) {
      if (rating > highestRating) {
        highestRating = rating
        highestLang = lang
      }
    }
    return { lang: highestLang, rating: highestRating }
  }

  const highest = getHighestRating()

  const stats = [
    { label: `Top Language (${highest.lang})`, value: highest.rating, icon: "🏅" },
    { label: "Games Played", value: 0, icon: "🎮" },
    { label: "Win Rate", value: "0%", icon: "📈" },
    { label: "Streak", value: 0, icon: "🔥" },
  ]

  return (
    <div className="space-y-8">
      {/* Quick Stats */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-card border border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors"
            >
              <div className="text-4xl mb-2">{stat.icon}</div>
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-foreground mt-2">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity (match Profile Recent Games markup exactly) */}
      <section>
        <Card>
          <CardHeader>
            <CardTitle>Recent Games</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : recent.length === 0 ? (
              <p className="text-muted-foreground text-center">No games played yet.</p>
            ) : (
              <div className="space-y-1">
                {recent.map((r) => (
                  <GameHistoryRow key={r.id} game={r} currentRating={getRatingFor(r.language)} matchId={r.id} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* User Info */}
      <section>
        <h2 className="text-2xl font-bold text-foreground mb-4">Profile Info</h2>
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="text-lg font-semibold text-foreground">{userProfile?.username}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="text-lg font-semibold text-foreground">{userProfile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="text-lg font-semibold text-foreground">
                {userProfile?.createdAt ? new Date(userProfile.createdAt).toLocaleDateString() : "N/A"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bio</p>
              <p className="text-lg font-semibold text-foreground">{userProfile?.bio || "No bio yet"}</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
