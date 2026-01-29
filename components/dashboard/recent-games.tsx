"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import GameHistoryRow from "./game-history-row"
import { Loader2 } from "lucide-react"

interface Props {
  userId?: string
  limit?: number
}

export default function RecentGames({ userId, limit = 20 }: Props) {
  const { userProfile } = useAuth()
  const uid = userId ?? userProfile?.uid
  const [games, setGames] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!uid) return
    let mounted = true
    setLoading(true)
    getUserSoloMatches(uid, limit)
      .then((h: any[]) => {
        if (mounted) setGames(h)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => void (mounted = false)
  }, [uid, limit])

  const getRatingFor = (lang: string) => {
    try {
      return (userProfile as any)?.languageRatings?.[lang] ?? 400
    } catch {
      return 400
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Games</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : games.length === 0 ? (
          <p className="text-muted-foreground text-center">No games played yet.</p>
        ) : (
          <div className="space-y-1">
            {games.map((g) => (
              <GameHistoryRow key={g.id} game={g} currentRating={getRatingFor(g.language)} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
