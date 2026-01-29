"use client"

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getSoloMatch } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, TrendingUp, TrendingDown } from "lucide-react"
import { Loader2 } from "lucide-react"

interface GameWithRating {
  id: string
  language: string
  mode?: string
  score?: number
  correctAnswers?: number
  questionsAnswered?: number
  ratingChange?: number
  ratingBefore?: number
  ratingAfter?: number
  questions?: any[]
  status?: string
}

export default function SpectatorMatchReviewPage() {
  const { matchId, userId } = useParams() as { matchId: string; userId: string }
  const searchParams = useSearchParams()
  const { userProfile } = useAuth()
  const [game, setGame] = useState<GameWithRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(true)
  const [animatedRating, setAnimatedRating] = useState<number>(0)
  const [isSpectator, setIsSpectator] = useState(false)

  useEffect(() => {
    if (!matchId || !userId) return

    const isSpectatorView = userId !== userProfile?.uid
    setIsSpectator(isSpectatorView)

    const fetchGame = async () => {
      try {
        // Try to fetch canonical solo_match first
        const solo = await getSoloMatch(matchId as string)
        if (solo) {
          setGame(solo)
        }
        // If not found, show not found error
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error fetching game:", error)
        setLoading(false)
      }
    }

    fetchGame()
  }, [matchId, userId, userProfile?.uid])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Match not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ratingChange = (game as any).ratingChange ?? 0
  const won = ratingChange > 0
  const correctPercentage = Math.round(
    ((game.correctAnswers ?? 0) / Math.max(game.questionsAnswered || 1, 1)) * 100
  )

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Results Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md sm:max-w-lg mx-auto">
            <div className="flex justify-end p-2">
              <button
                aria-label="Close"
                onClick={() => setShowModal(false)}
                className="p-2 rounded hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <CardHeader className="text-center space-y-2 pt-0">
              <CardTitle className="text-2xl">
                {isSpectator ? "Match Results" : "Game Over"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {game.score ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Points</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {correctPercentage}%
                  </div>
                  <div className="text-xs text-muted-foreground">Accuracy</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {game.correctAnswers ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {game.questionsAnswered ?? 0}
                  </div>
                  <div className="text-xs text-muted-foreground">Answered</div>
                </div>
              </div>

              {/* Rating Change or Indicator */}
              {game.ratingBefore !== undefined && game.ratingAfter !== undefined ? (
                <div
                  className={`p-4 rounded-lg text-center border-2 ${
                    won
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {won ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        won ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Rating
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      won ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {game.ratingAfter}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {won ? "+" : ""}{game.ratingAfter! - game.ratingBefore!} from{" "}
                    {game.ratingBefore}
                  </div>
                </div>
              ) : (
                <div
                  className={`p-4 rounded-lg text-center border-2 ${
                    won
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-center justify-center gap-2 mb-1">
                    {won ? (
                      <TrendingUp className="h-5 w-5 text-green-600" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-red-600" />
                    )}
                    <span
                      className={`text-sm font-semibold ${
                        won ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      Rating Change
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      won ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {won ? "+" : ""}{ratingChange}
                  </div>
                </div>
              )}

              <Button onClick={() => setShowModal(false)} className="w-full">
                {isSpectator ? "View Details" : "Review Questions"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Questions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{isSpectator ? "Match Details" : "Review Questions"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.isArray(game.questions) && game.questions.length > 0 ? (
              game.questions.map((q: any, idx: number) => {
                const skipped = q.userAnswerIndex === null || q.userAnswerIndex === undefined;
                return (
                  <div
                    key={idx}
                    className="border rounded-lg p-4 mb-2 bg-card"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold">Question {idx + 1}</span>
                      <span className="text-xs text-muted-foreground">{q.difficulty || ""}</span>
                    </div>
                    <div className="mb-2 text-sm text-foreground">{q.content}</div>
                    <div className="flex gap-2 items-center">
                      <span className={`text-sm font-semibold px-2 py-1 rounded ${q.correct ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{q.correct ? "Correct" : "Wrong"}</span>
                      {skipped && <span className="text-xs text-muted-foreground">Skipped</span>}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-muted-foreground">No questions recorded</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
