"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { listenToMatch, type Match } from "@/lib/multiplayer-queries"
import { Button } from "@/components/ui/button"

interface SpectatorArenaProps {
  matchId: string
  spectatorUsername: string
}

export default function SpectatorArena({ matchId, spectatorUsername }: SpectatorArenaProps) {
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [gameEnded, setGameEnded] = useState(false)
  const hasInitialized = useRef(false)

  // Listen to match updates
  useEffect(() => {
    const unsubscribe = listenToMatch(matchId, (updatedMatch: Match) => {
      setMatch(updatedMatch)

      if (updatedMatch.status === "completed") {
        setGameEnded(true)
      }

      // Calculate time for spectators
      if (updatedMatch.status === "in_progress" && !hasInitialized.current) {
        const rawMode = updatedMatch.challengeMode || updatedMatch.mode
        let modeTime = 3
        if (rawMode) {
          const modeStr = String(rawMode).replace("-", "")
          if (modeStr === "3min") modeTime = 3
          else if (modeStr === "5min") modeTime = 5
          else if (modeStr === "survival") modeTime = 999
        }

        console.log('[Spectator] Starting timer with minutes:', modeTime)
        setTimeLeft(modeTime * 60)
        hasInitialized.current = true
      }

      // Sync current question based on max progress
      const maxQuestionIndex = Math.max(
        updatedMatch.player1?.answers?.findIndex((a: any) => a === null) || 0,
        updatedMatch.player2?.answers?.findIndex((a: any) => a === null) || 0,
      )
      if (maxQuestionIndex > 0) {
        setCurrentQuestionIndex(Math.min(maxQuestionIndex, updatedMatch.questions.length - 1))
      }
    })

    return () => unsubscribe()
  }, [matchId]) // Removed timeLeft to prevent rapid resubscription

  // Timer countdown effect
  useEffect(() => {
    if (match && match.status === "in_progress" && !gameEnded) {
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 0) return 0
          return prevTime - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [match, gameEnded])

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading match...</p>
      </div>
    )
  }

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full text-center space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Match Complete!</h2>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{match.player1.username}</p>
                <p className="text-2xl font-bold text-foreground">{match.player1.score}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {match.player1.correctAnswers}/{match.questions.length}
                </p>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">{match.player2?.username}</p>
                <p className="text-2xl font-bold text-foreground">{match.player2?.score || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {match.player2?.correctAnswers || 0}/{match.questions.length}
                </p>
              </div>
            </div>

            <div className="text-lg font-semibold text-primary">
              {match.player1.score > (match.player2?.score || 0) ? match.player1.username : match.player2?.username}{" "}
              Wins!
            </div>
          </div>

          <Button onClick={() => router.push("/dashboard")} className="w-full">
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const question = match.questions[currentQuestionIndex]
  const player1Answer = match.player1.answers[currentQuestionIndex]
  const player2Answer = match.player2?.answers[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Spectating as</p>
              <p className="font-semibold text-foreground">{spectatorUsername}</p>
            </div>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">Timer</p>
              <p className="text-2xl font-bold text-foreground">
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {match.questions.length}
              </p>
            </div>
          </div>

          {/* Split Score Display */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">{match.player1.username}</p>
              <p className="text-2xl font-bold text-foreground">{match.player1.score}</p>
              <div className="flex justify-center gap-2 mt-1">
                <span className="text-xs text-green-600">{match.player1.correctAnswers} ✓</span>
                <span className="text-xs text-muted-foreground border-l pl-2">
                  Q{match.player1.answers.findIndex((a: any) => a === null) === -1 ? match.questions.length : match.player1.answers.findIndex((a: any) => a === null) + 1}
                </span>
              </div>
            </div>

            <div className="bg-muted p-3 rounded-lg text-center">
              <p className="text-xs text-muted-foreground mb-1">{match.player2?.username}</p>
              <p className="text-2xl font-bold text-foreground">{match.player2?.score || 0}</p>
              <div className="flex justify-center gap-2 mt-1">
                <span className="text-xs text-green-600">{match.player2?.correctAnswers || 0} ✓</span>
                <span className="text-xs text-muted-foreground border-l pl-2">
                  Q{match.player2 ? (match.player2.answers.findIndex((a: any) => a === null) === -1 ? match.questions.length : match.player2.answers.findIndex((a: any) => a === null) + 1) : 0}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Split Question View */}
        <div className="grid grid-cols-2 gap-4">
          {/* Player 1 */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground">{match.player1.username}'s View</h3>

            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-foreground">{question.content}</p>
              <div className="space-y-2">
                {question.options.map((option: string, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border transition-colors ${idx === question.correctAnswerIndex
                      ? "bg-green-500/20 border-green-500 text-green-700"
                      : player1Answer === idx
                        ? "bg-red-500/20 border-red-500 text-red-700"
                        : "bg-background border-border"
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold">{String.fromCharCode(65 + idx)}.</span>
                      <span className="text-sm">{option}</span>
                      {idx === question.correctAnswerIndex && <span className="text-xs ml-auto">✓ Correct</span>}
                      {player1Answer === idx && idx !== question.correctAnswerIndex && (
                        <span className="text-xs ml-auto">✗ Wrong</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="text-xs bg-green-500/20 text-green-700 px-2 py-1 rounded-full">
                Correct: {match.player1.correctAnswers}
              </div>
              <div className="text-xs bg-red-500/20 text-red-700 px-2 py-1 rounded-full">
                Wrong: {match.player1.wrongAnswers}
              </div>
            </div>
          </div>

          {/* Player 2 */}
          <div className="bg-card border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-foreground">{match.player2?.username}'s View</h3>

            <div className="space-y-3 bg-muted p-4 rounded-lg">
              <p className="text-sm font-medium text-foreground">{question.content}</p>
              <div className="space-y-2">
                {question.options.map((option: string, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border transition-colors ${idx === question.correctAnswerIndex
                      ? "bg-green-500/20 border-green-500 text-green-700"
                      : player2Answer === idx
                        ? "bg-red-500/20 border-red-500 text-red-700"
                        : "bg-background border-border"
                      }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold">{String.fromCharCode(65 + idx)}.</span>
                      <span className="text-sm">{option}</span>
                      {idx === question.correctAnswerIndex && <span className="text-xs ml-auto">✓ Correct</span>}
                      {player2Answer === idx && idx !== question.correctAnswerIndex && (
                        <span className="text-xs ml-auto">✗ Wrong</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <div className="text-xs bg-green-500/20 text-green-700 px-2 py-1 rounded-full">
                Correct: {match.player2?.correctAnswers || 0}
              </div>
              <div className="text-xs bg-red-500/20 text-red-700 px-2 py-1 rounded-full">
                Wrong: {match.player2?.wrongAnswers || 0}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-2">
          <Button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            variant="outline"
          >
            Previous
          </Button>
          <Button
            onClick={() => setCurrentQuestionIndex(Math.min(match.questions.length - 1, currentQuestionIndex + 1))}
            disabled={currentQuestionIndex === match.questions.length - 1}
            variant="outline"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
