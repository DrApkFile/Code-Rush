"use client"

import { useRef, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listenToMatch, updateMatchPlayerAnswer, completeMatch, appendMatchQuestions, updateMatchPlayerReady, startMatch, type Match } from "@/lib/multiplayer-queries"
import { useAuth } from "@/lib/auth-context"
import FriendResultsModal from "./friend-results-modal"

interface FriendGameArenaProps {
  matchId: string
}

export default function FriendGameArena({ matchId }: FriendGameArenaProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [match, setMatch] = useState<any>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [timeLeft, setTimeLeft] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([])
  const [gameStarted, setGameStarted] = useState(false)
  const [gameEnded, setGameEnded] = useState(false)
  const [playerNumber, setPlayerNumber] = useState<1 | 2>(1)
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null)
  const hasInitialized = useRef(false)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Setup initial state
  useEffect(() => {
    if (!match || !userProfile || hasInitialized.current) return

    // Determine player number
    const isPlayer1 = userProfile.uid === match.player1.uid
    setPlayerNumber(isPlayer1 ? 1 : 2)

    // Set initial answers from match
    const player = isPlayer1 ? match.player1 : match.player2
    setSelectedAnswers(player.answers || new Array(match.questions.length).fill(null))

    // Mark player as ready in Firestore
    if (!player.ready) {
      updateMatchPlayerReady(matchId, isPlayer1 ? 1 : 2, true)
    }

    // Calculate time based on mode
    const rawMode = match.challengeMode || match.mode
    console.log('[Arena] Initializing with mode:', rawMode)

    // Safety check: if mode is "friend", it's not a duration
    let modeTime = 3 // Default
    if (rawMode) {
      const modeStr = String(rawMode).replace("-", "")
      if (modeStr === "3min") modeTime = 3
      else if (modeStr === "5min") modeTime = 5
      else if (modeStr === "survival") modeTime = 999
    }

    console.log('[Arena] Calculated duration minutes:', modeTime)
    setTimeLeft(modeTime * 60)

    hasInitialized.current = true
  }, [match, userProfile, matchId])

  // Listen to match updates
  useEffect(() => {
    console.log('[Arena] Listening to match:', matchId)
    const unsubscribe = listenToMatch(matchId, (updatedMatch) => {
      console.log('[Arena] Match updated:', updatedMatch.id, {
        p1Ready: updatedMatch.player1.ready,
        p2Ready: updatedMatch.player2?.ready,
        p1Score: updatedMatch.player1.score,
        p2Score: updatedMatch.player2?.score
      })
      setMatch(updatedMatch)

      // Update game state
      if (updatedMatch.status === "in_progress") {
        setGameStarted(true)
      } else if (updatedMatch.status === "completed") {
        setGameEnded(true)
      }

      // Check if both players are ready and we need to start
      if (updatedMatch.status === "waiting" && updatedMatch.player1.ready && updatedMatch.player2?.ready) {
        // Automatically start the match if both are ready
        // (First client to see this will update Firestore)
        startMatch(matchId)
      }
    })

    return () => unsubscribe()
  }, [matchId])

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameEnded) return
    console.log('[Arena] Timer started')

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          console.log('[Arena] Timer hit zero')
          setGameEnded(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameEnded])

  const loadingMoreRef = useRef(false)

  // Start game when both players ready
  useEffect(() => {
    if (match && match.player1.ready && match.player2?.ready && !gameStarted) {
      console.log('[Arena] Both players ready! Starting game...')
      setGameStarted(true)
    }
  }, [match, gameStarted])

  // Infinite Scroll Check
  useEffect(() => {
    if (!match || !gameStarted || gameEnded) return

    // If we are close to end (e.g. 5 questions left), load more
    if (match.questions.length - currentQuestionIndex <= 5 && !loadingMoreRef.current) {
      loadingMoreRef.current = true
      console.log('[Arena] Triggering append questions...')
      appendMatchQuestions(matchId, match.language, 10).then(() => {
        loadingMoreRef.current = false
      })
    }
  }, [currentQuestionIndex, match?.questions?.length, gameStarted, gameEnded])

  const handleAnswerQuestion = async (answerIndex: number) => {
    if (!match || !!lastResult) return

    const currentQuestion = match.questions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex

    // Show feedback immediately
    setLastResult(isCorrect ? "correct" : "wrong")

    // Update local state
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)

    // Update in Firestore (fire and forget for snappiness)
    updateMatchPlayerAnswer(matchId, playerNumber, currentQuestionIndex, answerIndex, isCorrect)

    // Wait 650ms then move to next question (matches solo mode)
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setLastResult(null)
      if (currentQuestionIndex < match.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
      } else {
        setGameEnded(true)
      }
    }, 650)
  }

  const handleSkipQuestion = async () => {
    if (!match) return

    // Mark as skipped (answer = null, isCorrect = false)
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = null
    setSelectedAnswers(newAnswers)

    // Record the skip as a wrong answer in Firestore
    await updateMatchPlayerAnswer(matchId, playerNumber, currentQuestionIndex, null, false)

    // Move to next question
    if (currentQuestionIndex < match.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      setGameEnded(true)
    }
  }

  const handleNavigateNext = async () => {
    if (!match) return

    // If current question is unanswered, mark it as skipped
    if (selectedAnswers[currentQuestionIndex] === null || selectedAnswers[currentQuestionIndex] === undefined) {
      await handleSkipQuestion()
    } else {
      // Move to next question
      if (currentQuestionIndex < match.questions.length - 1) {
        setCurrentQuestionIndex((prev) => prev + 1)
      }
    }
  }

  const handleNavigatePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1)
    }
  }

  const handleGameEnd = async () => {
    if (!match) return

    // Mark any remaining unanswered questions as skipped
    const newAnswers = [...selectedAnswers]
    for (let i = currentQuestionIndex; i < match.questions.length; i++) {
      if (newAnswers[i] === null || newAnswers[i] === undefined) {
        newAnswers[i] = null
        // Record skip in Firestore
        await updateMatchPlayerAnswer(matchId, playerNumber, i, null, false)
      }
    }

    const player1Score = match.player1.score
    const player2Score = match.player2?.score || 0

    // completeMatch now requires language parameter
    await completeMatch(matchId, player1Score, player2Score, match.language)
    setGameEnded(true)
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading game...</p>
      </div>
    )
  }

  if (gameEnded) {
    return <FriendResultsModal match={match} />
  }

  // Waiting for opponent overlay
  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <div className="text-center">
          <p className="text-xl font-bold">Waiting for both players...</p>
          <p className="text-muted-foreground text-sm">
            {match.player1.username}: {match.player1.ready ? 'Ready ✓' : 'Connecting...'}
          </p>
          <p className="text-muted-foreground text-sm">
            {match.player2?.username || 'Opponent'}: {match.player2?.ready ? 'Ready ✓' : 'Connecting...'}
          </p>
        </div>
      </div>
    )
  }

  const question = match.questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-card border border-border rounded-lg p-4">
          <div>
            <p className="text-sm text-muted-foreground">Timer</p>
            <p className="text-2xl font-bold text-foreground">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </p>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {match.questions.length}
            </p>
          </div>

          <div className="text-right">
            <div className="flex gap-4">
              <div>
                <p className="text-xs text-muted-foreground">{match.player1.username} {playerNumber === 1 && '(You)'}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{match.player1.score}</p>
                  {playerNumber === 2 && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-muted-foreground">
                      Q{match.player1.answers.findIndex((a: any) => a === null) === -1 ? match.questions.length : match.player1.answers.findIndex((a: any) => a === null) + 1}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-muted-foreground">vs</div>
              <div>
                <p className="text-xs text-muted-foreground">{match.player2?.username} {playerNumber === 2 && '(You)'}</p>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-foreground">{match.player2?.score || 0}</p>
                  {playerNumber === 1 && match.player2 && (
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 px-1 rounded text-muted-foreground">
                      Q{match.player2.answers.findIndex((a: any) => a === null) === -1 ? match.questions.length : match.player2.answers.findIndex((a: any) => a === null) + 1}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{question.content}</h2>
            <div className="flex gap-2 mb-4">
              <span className="text-sm text-muted-foreground bg-muted px-2 py-0.5 rounded">Format: {question.format}</span>
              {lastResult && (
                <span className={`text-sm font-bold px-2 py-0.5 rounded animate-in fade-in zoom-in duration-200 ${lastResult === 'correct' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}>
                  {lastResult === 'correct' ? 'Correct!' : 'Wrong'}
                </span>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 relative">
            {question.options.map((option: string, idx: number) => {
              const isSelected = selectedAnswers[currentQuestionIndex] === idx
              const isCorrect = idx === question.correctAnswerIndex

              let variantClasses = "bg-background border-border hover:border-primary"
              if (lastResult) {
                if (isSelected) {
                  variantClasses = isCorrect
                    ? "bg-green-50 border-green-500 text-green-700 dark:bg-green-900/20 dark:border-green-600 dark:text-green-400"
                    : "bg-red-50 border-red-500 text-red-700 dark:bg-red-900/20 dark:border-red-600 dark:text-red-400"
                } else if (isCorrect) {
                  variantClasses = "bg-green-50/50 border-green-200 text-green-600 dark:bg-green-900/10 dark:border-green-800 dark:text-green-500"
                }
              } else if (isSelected) {
                variantClasses = "bg-primary/10 border-primary text-primary"
              }

              return (
                <button
                  key={idx}
                  onClick={() => handleAnswerQuestion(idx)}
                  disabled={!!lastResult}
                  className={`w-full p-4 text-left border rounded-lg transition-all transform active:scale-[0.98] ${variantClasses}`}
                >
                  <div className="flex justify-between items-center">
                    <span>{option}</span>
                    {lastResult && isSelected && (
                      <span>{isCorrect ? '✓' : '✕'}</span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Navigation */}
          <div className="flex justify-between">
            <button
              onClick={handleNavigatePrev}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 border border-border rounded-lg hover:bg-muted disabled:opacity-50"
            >
              Previous
            </button>

            {currentQuestionIndex === match.questions.length - 1 ? (
              <button
                onClick={handleGameEnd}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Submit
              </button>
            ) : (
              <button
                onClick={handleNavigateNext}
                className="px-4 py-2 border border-border rounded-lg hover:bg-muted"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
