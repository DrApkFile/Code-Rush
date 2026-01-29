"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { listenToMatch, updateMatchPlayerAnswer, completeMatch, getMatch, type Match } from "@/lib/multiplayer-queries"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle } from "lucide-react"
import ResultsModal from "@/components/game/results-modal"

export default function FriendMatchPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()

  const matchId = params?.matchId as string
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [gameOver, setGameOver] = useState(false)
  const [playerNumber, setPlayerNumber] = useState<1 | 2 | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Initialize match and set up real-time listener
  useEffect(() => {
    const initMatch = async () => {
      try {
        const matchData = await getMatch(matchId)
        if (!matchData) {
          setError("Match not found")
          setLoading(false)
          return
        }

        setMatch(matchData)

        // Determine which player is current user
        if (user?.uid === matchData.player1.uid) {
          setPlayerNumber(1)
        } else if (matchData.player2 && user?.uid === matchData.player2.uid) {
          setPlayerNumber(2)
        } else {
          setError("You are not part of this match")
          setLoading(false)
          return
        }

        setLoading(false)

        // Set up real-time listener
        const unsubscribe = listenToMatch(matchId, (updatedMatch) => {
          setMatch(updatedMatch)
          if (updatedMatch.status === "completed") {
            setGameOver(true)
          }
        })

        unsubscribeRef.current = unsubscribe
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load match")
        setLoading(false)
      }
    }

    if (user) {
      initMatch()
    }

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [user, matchId])

  const handleAnswer = async (optionIndex: number) => {
    if (!match || !playerNumber || gameOver) return

    try {
      const currentQuestion = match.questions[0] // In real implementation, track question index
      const isCorrect = optionIndex === currentQuestion.correctAnswerIndex

      await updateMatchPlayerAnswer(matchId, playerNumber, 0, optionIndex, isCorrect)

      // Check if all players are done
      const player1Done = match.player1.answers.every((a) => a !== null)
      const player2Done = !match.player2 || match.player2.answers.every((a) => a !== null)

      if (player1Done && player2Done) {
        const player1Score = match.player1.score
        const player2Score = match.player2?.score || 0
        await completeMatch(matchId, player1Score, player2Score, match.language)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit answer")
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    )
  }

  if (error || !match) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Match failed to load"}</AlertDescription>
        </Alert>
      </main>
    )
  }

  if (gameOver) {
    return (
      <ResultsModal
        session={{
          id: matchId,
          userId: user?.uid || "",
          mode: "3-min",
          language: match.language,
          score: playerNumber === 1 ? match.player1.score : match.player2?.score || 0,
          correctAnswers: playerNumber === 1 ? match.player1.correctAnswers : match.player2?.correctAnswers || 0,
          totalQuestions: match.questions.length,
          wrongAnswers: playerNumber === 1 ? match.player1.wrongAnswers : match.player2?.wrongAnswers || 0,
          accuracy:
            playerNumber === 1
              ? (match.player1.correctAnswers / match.questions.length) * 100
              : ((match.player2?.correctAnswers || 0) / match.questions.length) * 100,
          timeLeft: 0,
          startTime: match.createdAt,
          endTime: match.endedAt,
          questions: match.questions,
          currentQuestionIndex: match.questions.length,
          answers: playerNumber === 1 ? match.player1.answers : match.player2?.answers || [],
          gameOver: true,
        }}
        onClose={() => router.push("/dashboard")}
      />
    )
  }

  const opponent = playerNumber === 1 ? match.player2 : null
  const currentQuestion = match.questions[0]

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Players Info */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-card/50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-3">
                <Avatar>
                  <AvatarImage src={match.player1.profilePicture || "/placeholder.svg"} />
                  <AvatarFallback>{match.player1.username.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-foreground">{match.player1.username}</p>
                  <p className="text-xs text-muted-foreground">Rating: {match.player1.eloRating}</p>
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <p>Score: {match.player1.score}</p>
                <p>Correct: {match.player1.correctAnswers}</p>
              </div>
            </CardContent>
          </Card>

          {opponent && (
            <Card className="bg-card/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar>
                    <AvatarImage src={opponent.profilePicture || "/placeholder.svg"} />
                    <AvatarFallback>{opponent.username.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">{opponent.username}</p>
                    <p className="text-xs text-muted-foreground">Rating: {opponent.eloRating}</p>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <p>Score: {opponent.score}</p>
                  <p>Correct: {opponent.correctAnswers}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Question */}
        {currentQuestion && (
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {match.language} - {currentQuestion.difficulty}
                </p>
                <h2 className="text-xl font-semibold text-foreground">{currentQuestion.content}</h2>
              </div>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((option: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="w-full text-left p-4 rounded-lg border border-border bg-card hover:border-primary hover:bg-card/80 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-muted-foreground text-sm">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="font-medium">{option}</span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
