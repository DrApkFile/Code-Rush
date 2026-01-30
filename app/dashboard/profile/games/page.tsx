"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, ChevronLeft } from "lucide-react"
import GameHistoryRow from "@/components/dashboard/game-history-row"

export default function AllGamesPage() {
    const router = useRouter()
    const { userProfile } = useAuth()
    const [games, setGames] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (userProfile?.uid) {
            const fetchGames = async () => {
                setLoading(true)
                try {
                    // Fetch last 100 games for now (can add pagination later)
                    const allGames = await getUserSoloMatches(userProfile.uid, 50)
                    setGames(allGames)
                } catch (error) {
                    console.error("Error fetching all games:", error)
                } finally {
                    setLoading(false)
                }
            }
            fetchGames()
        }
    }, [userProfile?.uid])

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-3xl font-bold">Game History</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>All Games</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : games.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-muted-foreground">No games found.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {games.map((game) => (
                                <GameHistoryRow
                                    key={game.id}
                                    game={game}
                                    matchId={game.id}
                                    currentRating={(userProfile as any)?.languageRatings?.[game.language] ?? 400}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
