"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getUserGameHistory, type GameSession } from "@/lib/game-queries"
import { getSoloMatch, getMatch } from "@/lib/multiplayer-queries"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { X, TrendingUp, TrendingDown, Trophy, Skull } from "lucide-react"
import { Loader2 } from "lucide-react"

interface GameWithRating extends GameSession {
  ratingBefore?: number
  ratingAfter?: number
  winner?: string
  player1?: any
  player2?: any
}

export default function MatchReviewPage() {
  const { matchId } = useParams()
  const { userProfile } = useAuth()
  const [game, setGame] = useState<GameWithRating | null>(null)
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(true)
  const [animatedRating, setAnimatedRating] = useState<number>(0)

  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null)

  useEffect(() => {
    if (!matchId || !userProfile?.uid) return

    const fetchGame = async () => {
      try {
        // 1. Prefer canonical solo_match doc (contains full questions + rating snapshot)
        let foundStats: any = await getSoloMatch(matchId as string)

        // 2. If not found, try Multiplayer Match (Friend Game)
        if (!foundStats) {
          const mpMatch = await getMatch(matchId as string)
          if (mpMatch) {
            const isP1 = mpMatch.player1.uid === userProfile.uid
            const pData = isP1 ? mpMatch.player1 : mpMatch.player2
            const pStats = isP1 ? mpMatch.results?.player1 : mpMatch.results?.player2

            if (pData) {
              foundStats = {
                id: mpMatch.id,
                userId: userProfile.uid,
                mode: 'friend',
                language: mpMatch.language,
                startTime: mpMatch.startedAt ? new Date(mpMatch.startedAt) : new Date(),
                endTime: mpMatch.endedAt ? new Date(mpMatch.endedAt) : new Date(),
                score: pStats?.score ?? pData.score,
                correctAnswers: pStats?.correctAnswers ?? pData.correctAnswers ?? 0,
                wrongAnswers: pData.wrongAnswers ?? 0,
                questionsAnswered: (pStats?.correctAnswers || 0) + (pData.wrongAnswers || 0),
                accuracy: pStats?.accuracy || 0,
                questions: mpMatch.questions,
                answers: pData.answers,
                winner: mpMatch.winner,
                player1: mpMatch.player1,
                player2: mpMatch.player2,
                ratingChange: 0, // usually unrated or handled differently
              }
            }
          }
        }

        // 3. Fallback to previous game_sessions-based history lookup
        if (!foundStats) {
          const history = await getUserGameHistory(userProfile.uid, 100)
          const foundGame = history.find((g) => g.id === matchId)
          if (foundGame) {
            // Calculate ratingBefore and ratingAfter from user's current rating and stored change
            const ratingChange = (foundGame as any).ratingChange ?? 0
            const currentRating =
              (userProfile?.languageRatings as any)?.[foundGame.language] ?? 400
            const ratingBefore = Math.max(400, currentRating - ratingChange)
            const ratingAfter = currentRating

            foundStats = {
              ...foundGame,
              ratingBefore,
              ratingAfter,
            }
          }
        }

        setGame(foundStats || null)
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error fetching game:", error)
        setLoading(false)
      }
    }

    fetchGame()
  }, [matchId, userProfile?.uid])

  // Animate rating on mount
  useEffect(() => {
    if (!game?.ratingBefore || !game?.ratingAfter) return
    if (game.ratingBefore === game.ratingAfter) return

    const start = game.ratingBefore
    const end = game.ratingAfter
    const delta = end - start
    const steps = Math.abs(delta)
    const duration = Math.max(600, Math.min(1500, steps * 8))
    const stepDuration = duration / Math.max(steps, 1)

    let current = start
    setAnimatedRating(current)

    const interval = setInterval(() => {
      current += delta > 0 ? 1 : -1
      setAnimatedRating(current)
      if ((delta > 0 && current >= end) || (delta < 0 && current <= end)) {
        clearInterval(interval)
        setAnimatedRating(end)
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [game?.ratingBefore, game?.ratingAfter])

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
  const won = game.mode === 'friend'
    ? game.winner === userProfile?.uid
    : ratingChange > 0

  // Safe stats derivation
  const rawScore = (game as any).results?.player1?.score ?? game.score ?? 0
  const rawCorrect = (game as any).results?.player1?.correctAnswers ?? game.correctAnswers ?? 0
  const rawWrong = (game as any).results?.player1?.wrongAnswers ?? (game as any).player1?.wrongAnswers ?? game.wrongAnswers ?? (game as any).strikes ?? 0
  // Answered count fallback: try explicit field, else sum correct+wrong
  const rawAnswered = (game as any).questionsAnswered ?? (game as any).results?.player1?.questionsAnswered ?? (rawCorrect + rawWrong)

  const correctPercentage = (game as any).accuracy ?? Math.round(
    (rawCorrect / Math.max(rawAnswered, 1)) * 100
  )

  const isFriendMode = game.mode === 'friend'

  const QuestionReviewModal = ({ idx }: { idx: number }) => {
    const q = game.questions[idx]
    // Try to get user answer from game.answers array if available, 
    // or fallback to game.player1.answers (canonical structure)
    const userChoice = (game as any).answers?.[idx] ?? (game as any).player1?.answers?.[idx] ?? null

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-2xl mx-auto bg-card border rounded text-left">
          <div className="flex justify-between items-center p-3">
            <div className="text-lg font-semibold">Question {idx + 1}</div>
            <div>
              <Button variant="ghost" onClick={() => setSelectedReviewIndex(null)}>Close</Button>
            </div>
          </div>
          <div className="p-4">
            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">Difficulty: {q.difficulty}</div>
              <div className="text-lg font-medium mb-2">{q.content}</div>
              <div className="space-y-2">
                {q.options.map((opt: string, i: number) => {
                  const isCorrectOpt = i === q.correctAnswerIndex
                  const isUserOpt = userChoice === i
                  return (
                    <div key={i} className={`p-3 rounded border ${isCorrectOpt ? 'bg-green-50 border-green-200' : isUserOpt ? 'bg-yellow-50 border-yellow-200' : 'bg-transparent'}`}>
                      <div className="flex items-center gap-2">
                        <div className="font-mono w-6">{String.fromCharCode(65 + i)}</div>
                        <div className="flex-1">{opt}</div>
                        {isCorrectOpt && <div className="text-green-700 text-sm font-semibold">Correct</div>}
                        {isUserOpt && !isCorrectOpt && <div className="text-red-700 text-sm font-semibold">Your answer</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
              {q.explanation && (
                <div className="mt-4 p-3 bg-secondary rounded">
                  <div className="text-sm font-semibold mb-1">Explanation</div>
                  <div className="text-sm text-muted-foreground">{q.explanation}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      {/* Results Modal - Always show for context, but allow closing to see 'restricted' page if needed, or just keep it */}
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
              <CardTitle className="text-2xl">{
                isFriendMode
                  ? (won ? "You Won!" : "You Lost")
                  : "Game Over"
              }</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Compact Stats Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {rawScore}
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
                    {rawCorrect}
                  </div>
                  <div className="text-xs text-muted-foreground">Correct</div>
                </div>
                <div className="bg-card border border-border rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-foreground">
                    {rawAnswered}
                  </div>
                  <div className="text-xs text-muted-foreground">Answered</div>
                </div>
              </div>

              {/* Rating Change Animation or Winner Icon */}
              {!isFriendMode && game.ratingBefore !== undefined && game.ratingAfter !== undefined && (
                <div
                  className={`p-4 rounded-lg text-center border-2 ${won
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
                      className={`text-sm font-semibold ${won ? "text-green-600" : "text-red-600"
                        }`}
                    >
                      Rating
                    </span>
                  </div>
                  <div
                    className={`text-3xl font-bold ${won ? "text-green-600" : "text-red-600"
                      }`}
                  >
                    {animatedRating}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {won ? "+" : ""}{game.ratingAfter! - game.ratingBefore!} from{" "}
                    {game.ratingBefore}
                  </div>
                </div>
              )}

              {isFriendMode && (
                <div className={`p-6 rounded-lg text-center border-2 flex flex-col items-center gap-2 ${won ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  {won ? <Trophy className="w-12 h-12 text-yellow-500" /> : <Skull className="w-12 h-12 text-gray-500" />}
                  <p className={`text-lg font-bold ${won ? 'text-green-700' : 'text-red-700'}`}>
                    {won ? 'Victory!' : 'Defeat'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Played against {game.player1.uid === userProfile?.uid ? game.player2?.username : game.player1.username}
                  </p>
                </div>
              )}

              {!isFriendMode && (
                <Button onClick={() => setShowModal(false)} className="w-full">
                  Review Questions
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Questions Section - Hidden for Friend Matches */}
      {!isFriendMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Review Questions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Array.isArray(game.questions) && game.questions.length > 0 ? (
                game.questions.map((q: any, idx: number) => {
                  const skipped =
                    q.userAnswerIndex === null || q.userAnswerIndex === undefined
                  return (
                    <div
                      key={idx}
                      className="border rounded-lg p-4 mb-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedReviewIndex(idx)}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold">Question {idx + 1}</span>
                        <span className="text-xs text-muted-foreground">
                          {q.difficulty || ""}
                        </span>
                      </div>
                      <div className="mb-2 text-sm text-foreground">
                        {q.content}
                      </div>
                      <div className="flex gap-2 items-center">
                        <span
                          className={`text-sm font-semibold px-2 py-1 rounded ${q.correct
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                            }`}
                        >
                          {q.correct ? "Correct" : "Wrong"}
                        </span>
                        {skipped && (
                          <span className="text-xs text-muted-foreground">
                            Skipped
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-muted-foreground">No questions recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-12 text-muted-foreground italic">
          Questions from Play with Friend matches cannot be reviewed here. Review is only available immediately after the game.
        </div>
      )}

      {selectedReviewIndex !== null && <QuestionReviewModal idx={selectedReviewIndex} />}
    </div>
  )
}
