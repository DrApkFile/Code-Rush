"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { getSoloMatch } from "@/lib/multiplayer-queries"
import { Button } from "@/components/ui/button"
import { Loader2, AlertCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { Question } from "@/lib/game-queries"

interface LocalGameSession {
  id: string
  userId: string
  mode: "3min" | "5min" | "survival"
  language: "HTML" | "CSS" | "JavaScript"
  format?: string
  score: number
  correctAnswers: number
  totalQuestions: number
  wrongAnswers: number
  accuracy: number
  timeLeft: number
  startTime: Date
  endTime?: Date
  currentQuestionIndex: number
  answers: (number | null)[]
  gameOver: boolean
  questionsAnswered: number
  strikes: number
  status: "in_progress" | "completed" | "abandoned"
  questions: Question[]
  sessionQuestions: Array<{
    questionId: string
    correct: boolean
    timeSpent: number
  }>
}

export default function ReviewPage() {
  const router = useRouter()
  const params = useParams()
  const { user } = useAuth()

  const gameId = (params.gameId as string) || ""
  const mode = (params.mode as string) || "solo"

  const [gameSession, setGameSession] = useState<LocalGameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null)
  const [questionCache, setQuestionCache] = useState<Record<string, Question> | null>(null)

  useEffect(() => {
    // First try to fetch the canonical solo_match from Firestore
    const fetchFromFirestore = async () => {
      try {
        const solo = await getSoloMatch(gameId)
        if (solo) {
          // Convert Firestore solo_match shape to LocalGameSession shape
          setGameSession({
            id: solo.id,
            userId: solo.player1?.uid || user?.uid || "",
            mode: (solo.gameMode || "3min") as "3min" | "5min" | "survival",
            language: solo.language,
            score: solo.results?.player1?.score ?? (solo.player1?.score ?? 0),
            correctAnswers: solo.player1?.correctAnswers ?? 0,
            totalQuestions: solo.questions?.length ?? 0,
            wrongAnswers: solo.player1?.wrongAnswers ?? 0,
            accuracy: solo.results?.player1?.accuracy ?? 0,
            timeLeft: 0,
            startTime: new Date(solo.createdAt || 0),
            endTime: new Date(solo.endedAt || 0),
            currentQuestionIndex: (solo.questions?.length ?? 0) - 1,
            answers: solo.player1?.answers ?? [],
            gameOver: true,
            questionsAnswered: solo.questions?.length ?? 0,
            strikes: 0,
            status: "completed" as const,
            questions: solo.questions ?? [],
            sessionQuestions: solo.sessionQuestions ?? [],
          } as LocalGameSession)
          setLoading(false)
          return true
        }
      } catch (e) {
        console.warn("[Review] Failed to fetch from Firestore, falling back to sessionStorage:", e)
      }
      return false
    }

    const loadReview = async () => {
      // Try Firestore first
      const found = await fetchFromFirestore()
      if (!found) {
        // Fallback to sessionStorage for in-progress sessions
        const lastId = sessionStorage.getItem("last_game_id")
        if (lastId && lastId === gameId) {
          const raw = sessionStorage.getItem(`current_game_${lastId}`)
          if (raw) {
            try {
              const saved = JSON.parse(raw) as LocalGameSession
              setGameSession(saved)
              setLoading(false)
              sessionStorage.removeItem('last_view')
              sessionStorage.removeItem('reload_triggered')
              return
            } catch (e) {
              // ignore
            }
          }
        }
      }
      setLoading(false)
    }

    loadReview()
  }, [gameId, user?.uid])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    )
  }

  if (!gameSession) {

  // Build a question cache index from sessionStorage for faster lookups
  useEffect(() => {
    try {
      const map: Record<string, Question> = {}
      for (const key of Object.keys(sessionStorage)) {
        if (!key.startsWith("questions_")) continue
        const raw = sessionStorage.getItem(key)
        if (!raw) continue
        try {
          const arr = JSON.parse(raw) as Question[]
          for (const q of arr) {
            if (q && q.id) map[q.id] = q
          }
        } catch (e) {
          // ignore malformed entries
        }
      }
      setQuestionCache(Object.keys(map).length ? map : null)
    } catch (e) {
      setQuestionCache(null)
    }
  }, [])
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Review session not found</AlertDescription>
        </Alert>
      </main>
    )
  }

  // Find question using cached index for speed; fallback to scanning sessionStorage
  function findQuestionInSessionStorage(questionId: string): Question | undefined {
    try {
      if (questionCache && questionCache[questionId]) return questionCache[questionId]

      for (const key of Object.keys(sessionStorage)) {
        if (!key.startsWith("questions_")) continue
        const raw = sessionStorage.getItem(key)
        if (!raw) continue
        const arr = JSON.parse(raw) as Question[]
        const found = arr.find((x) => x.id === questionId)
        if (found) return found
      }
    } catch (e) {
      // ignore
    }
    return undefined
  }

  const QuestionReviewModal = ({ idx }: { idx: number }) => {
    const q = gameSession.questions[idx]
    const userChoice = gameSession.answers[idx]
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="w-full max-w-2xl mx-auto bg-card border rounded">
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
                {q.options.map((opt, i) => {
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

  // Show only answered questions
  const answeredIndices = gameSession.answers
    .map((a, i) => (typeof a === "number" ? i : -1))
    .filter((i) => i >= 0)

  const indicesToShow = answeredIndices.length > 0 ? answeredIndices : [0]

  return (
    <main className="min-h-screen p-4 bg-gradient-to-br from-background to-secondary">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Review Questions</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              // Clear flags that can cause an active game to be restored
              sessionStorage.removeItem('last_view')
              sessionStorage.removeItem('last_game_id')
              try { sessionStorage.removeItem(`current_game_${gameId}`) } catch (e) {}
              // Navigate back to the play mode setup page (preserve the route segment)
              router.push(`/dashboard/play/${mode}/setup`)
            }}>
              Back to Setup
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {Array.isArray(gameSession?.questions) && gameSession.questions.length > 0 ? (
            gameSession.questions.map((q: any, idx: number) => {
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
      </div>

      {selectedReviewIndex !== null && <QuestionReviewModal idx={selectedReviewIndex} />}
    </main>
  )
}
