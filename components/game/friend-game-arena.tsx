"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { listenToMatch } from "@/lib/multiplayer-queries"
import { updateMatchPlayerAnswer, completeMatch } from "@/lib/multiplayer-queries"
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

  // Setup initial state
  useEffect(() => {
    if (!match || !userProfile) return

    // Determine player number
    const isPlayer1 = userProfile.uid === match.player1.uid
    setPlayerNumber(isPlayer1 ? 1 : 2)

    // Set initial answers from match
    const player = isPlayer1 ? match.player1 : match.player2
    setSelectedAnswers(player.answers || new Array(match.questions.length).fill(null))

    // Calculate time based on mode
    const modeTime = match.mode === "3-min" ? 3 : match.mode === "5-min" ? 5 : 999
    setTimeLeft(modeTime * 60)
  }, [match, userProfile])

  // Listen to match updates
  useEffect(() => {
    const unsubscribe = listenToMatch(matchId, (updatedMatch) => {
      setMatch(updatedMatch)
    })

    return () => unsubscribe()
  }, [matchId])

  // Timer countdown
  useEffect(() => {
    if (!gameStarted || gameEnded || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameEnded(true)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [gameStarted, gameEnded, timeLeft])

  // Start game when both players ready
  useEffect(() => {
    if (match && match.player1.ready && match.player2.ready && !gameStarted) {
      setGameStarted(true)
    }
  }, [match, gameStarted])

  const handleAnswerQuestion = async (answerIndex: number) => {
    if (!match) return

    const currentQuestion = match.questions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correctAnswerIndex

    // Update local state
    const newAnswers = [...selectedAnswers]
    newAnswers[currentQuestionIndex] = answerIndex
    setSelectedAnswers(newAnswers)

    // Update in Firestore
    await updateMatchPlayerAnswer(matchId, playerNumber, currentQuestionIndex, answerIndex, isCorrect)

    // Move to next question
    if (currentQuestionIndex < match.questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1)
    } else {
      setGameEnded(true)
    }
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
                <p className="text-xs text-muted-foreground">{match.player1.username}</p>
                <p className="font-bold text-foreground">{match.player1.score}</p>
              </div>
              <div className="text-muted-foreground">vs</div>
              <div>
                <p className="text-xs text-muted-foreground">{match.player2?.username}</p>
                <p className="font-bold text-foreground">{match.player2?.score || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-card border border-border rounded-lg p-8 space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2">{question.content}</h2>
            <p className="text-sm text-muted-foreground">Format: {question.format}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option: string, idx: number) => (
              <button
                key={idx}
                onClick={() => handleAnswerQuestion(idx)}
                className={`w-full p-4 text-left border rounded-lg transition-colors ${
                  selectedAnswers[currentQuestionIndex] === idx
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:border-primary"
                }`}
              >
                {option}
              </button>
            ))}
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
