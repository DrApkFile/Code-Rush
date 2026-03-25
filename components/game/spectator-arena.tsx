"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { listenToMatch, type Match } from "@/lib/multiplayer-queries"
import { Button } from "@/components/ui/button"
import FriendResultsModal from "./friend-results-modal"
import { Loader2 } from "lucide-react"

interface SpectatorArenaProps {
  matchId: string
  spectatorUsername: string
}

export default function SpectatorArena({ matchId, spectatorUsername }: SpectatorArenaProps) {
  const router = useRouter()
  const [match, setMatch] = useState<Match | null>(null)
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

      // Rematch redirection for spectators
      if (updatedMatch.rematch?.newMatchId) {
        console.log('[Spectator] Rematch detected! Redirecting to:', updatedMatch.rematch.newMatchId)
        router.push(`/challenge/${updatedMatch.rematch.newMatchId}`)
      }

      // Calculate time for spectators
      if (updatedMatch.status === "in_progress" && !hasInitialized.current) {
        const rawMode = updatedMatch.challengeMode || updatedMatch.mode
        let modeTime = 3
        if (rawMode) {
          const modeStr = String(rawMode).replace("-", "").toLowerCase()
          if (modeStr === "3min") modeTime = 3
          else if (modeStr === "5min") modeTime = 5
          else if (modeStr === "survival") modeTime = 999
        }

        console.log('[Spectator] Starting timer with minutes:', modeTime)
        setTimeLeft(modeTime * 60)
        hasInitialized.current = true
      }
    })

    return () => unsubscribe()
  }, [matchId, router])

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
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">Joining arena as spectator...</p>
      </div>
    )
  }

  // Show results modal for spectators when game ends
  if (gameEnded || match.status === "completed") {
    return <FriendResultsModal match={match} isSpectator={true} />
  }

  const renderPlayerView = (playerNum: 1 | 2) => {
    const player = playerNum === 1 ? match.player1 : match.player2
    if (!player) return null

    const qIndex = player.currentQuestionIndex || 0
    const question = match.questions[qIndex]
    const playerAnswer = player.answers[qIndex]

    return (
      <div className="bg-card border border-border rounded-lg p-6 space-y-4 shadow-sm">
        <div className="flex justify-between items-center border-b pb-3 border-border">
          <div>
            <h3 className="font-bold text-foreground text-lg">{player.username}</h3>
            <p className="text-xs text-muted-foreground">Rating: {player.languageRatings?.[match.language] || 1200}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{player.score}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-tight">Current Score</p>
          </div>
        </div>

        {question ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs bg-muted px-2 py-1 rounded-full text-muted-foreground">
                Question {qIndex + 1} of {match.questions.length}
              </span>
              <div className="flex gap-2">
                <span className="text-xs text-green-600 font-medium">{player.correctAnswers} ✓</span>
                <span className="text-xs text-red-500 font-medium">{player.wrongAnswers} ✗</span>
              </div>
            </div>

            <div className="bg-muted/50 p-4 rounded-lg border border-border/50">
              <p className="text-sm font-semibold text-foreground mb-4 leading-relaxed">{question.content}</p>

              <div className="space-y-2">
                {question.options.map((option: string, idx: number) => {
                  const isCorrect = idx === question.correctAnswerIndex
                  const isPlayerChoice = playerAnswer === idx

                  let stateClass = "bg-background border-border"
                  if (playerAnswer !== null && playerAnswer !== undefined) {
                    if (isCorrect) stateClass = "bg-green-500/10 border-green-500 text-green-700 dark:text-green-400"
                    else if (isPlayerChoice) stateClass = "bg-red-500/10 border-red-500 text-red-700 dark:text-red-400"
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-md border text-sm transition-all flex items-center gap-3 ${stateClass}`}
                    >
                      <span className="w-6 h-6 flex items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {playerAnswer !== null && playerAnswer !== undefined && (
                        <div className="ml-auto">
                          {isCorrect && <span className="text-xs font-bold text-green-600">✓</span>}
                          {isPlayerChoice && !isCorrect && <span className="text-xs font-bold text-red-500">✗</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {playerAnswer === null || playerAnswer === undefined ? (
                <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Thinking...</span>
                </div>
              ) : (
                <div className="mt-4 text-center">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${playerAnswer === question.correctAnswerIndex ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {playerAnswer === question.correctAnswerIndex ? 'CORRECT' : 'WRONG'}
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic border-2 border-dashed border-border rounded-lg">
            <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-20" />
            <p>Waiting for questions...</p>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 bg-card border border-border rounded-2xl p-6 shadow-xl backdrop-blur-sm bg-white/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <span className="font-bold text-xl">CR</span>
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-foreground uppercase italic">Spectator Mode</h1>
              <p className="text-xs text-muted-foreground font-medium">Viewing as <span className="text-primary">{spectatorUsername}</span></p>
            </div>
          </div>

          <div className="flex items-center gap-8">
            <div className="text-center px-6 py-2 bg-slate-100 dark:bg-slate-800 rounded-xl border border-border">
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mb-1">Time Remaining</p>
              <p className={`text-3xl font-black tabular-nums ${timeLeft < 30 ? 'text-red-500 animate-pulse' : 'text-foreground'}`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
              </p>
            </div>
          </div>

          <div className="hidden lg:block text-right">
            <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              Live Sync Active
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Multiplayer Match v2.0</p>
          </div>
        </div>

        {/* Live Views */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {renderPlayerView(1)}
          {renderPlayerView(2)}
        </div>

        {/* Spectator Footer */}
        <div className="flex justify-center flex-wrap gap-4">
          <div className="px-4 py-2 bg-card border border-border rounded-full text-xs font-medium text-muted-foreground shadow-sm">
            <span className="font-bold text-foreground">Tip:</span> Redirection to rematches is automatic. Sit back and enjoy!
          </div>
        </div>
      </div>
    </div>
  )
}
