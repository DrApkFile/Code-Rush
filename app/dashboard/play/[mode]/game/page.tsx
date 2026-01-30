"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  getCachedQuestions,
  fetchRandomQuestions,
  fetchBalancedRandomQuestions,
  createGameSession,
  updateGameSession,
  type GameSession,
  type Question
} from "@/lib/game-queries"
import { createSoloMatch } from "@/lib/multiplayer-queries"

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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Loader2, AlertCircle, ChevronLeft } from "lucide-react"
import ResultsModal from "@/components/game/results-modal"
import QuestionRenderer from "@/components/game/question-renderer"
import { useToast } from "@/components/ui/use-toast"

export default function GamePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const { user, updateUserProfile, userProfile } = useAuth()
  const { toast } = useToast()

  const languageParam = searchParams.get("language") || "JavaScript"
  const language = (languageParam === "random" ? undefined : languageParam) as "HTML" | "CSS" | "JavaScript" | undefined
  const actualLanguage = language || "JavaScript" // for display/Firestore
  // `params.mode` is the play route segment ("solo" | "friend" | "random").
  // The selected game duration ("3min" | "5min" | "survival") is passed as a
  // query param named `mode` from the setup page. Read the query param here
  // to determine the time mode, and keep the route param reserved for play type.
  const playType = (params.mode as string) || "solo"
  const mode = ((searchParams.get("mode") as string)?.replace("-", "") || "3min") as "3min" | "5min" | "survival"
  const formatParam = searchParams.get("format") ?? undefined
  const format = formatParam === "all" ? undefined : (formatParam as "MCQ" | "Fill in the Blank" | "Fix the Code" | undefined)
  const [gameSession, setGameSession] = useState<LocalGameSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [showResults, setShowResults] = useState(false)
  const [ratingChange, setRatingChange] = useState<number | null>(null)
  const [prevRatingValue, setPrevRatingValue] = useState<number | null>(null)
  const [newRatingValue, setNewRatingValue] = useState<number | null>(null)
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null)
  const [showConfirmExit, setShowConfirmExit] = useState(false)
  const [exitSource, setExitSource] = useState<"back" | "reload" | "button" | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const gameSessionRef = useRef<LocalGameSession | null>(null)
  const timeLeftRef = useRef<number>(0)
  const initGameRef = useRef<boolean>(false) // Guard against duplicate initialization
  const isSavingRef = useRef<boolean>(false) // Guard against duplicate saves

  // Game mode settings
  const getModeSettings = (mode: string) => {
    const settings = {
      "3min": { duration: 180, maxQuestions: 999 }, // keep large pool, we will preload/append
      "5min": { duration: 300, maxQuestions: 999 },
      survival: { duration: -1, maxQuestions: 999 },
    }
    return settings[mode as keyof typeof settings] || settings["3min"]
  }

  const modeSettings = getModeSettings(mode)

  // Shared abandonment logic
  const handleAbandonment = async (session: LocalGameSession) => {
    // Guard against race conditions using same ref as endGame
    if (isSavingRef.current) return { accuracy: 0, gained: 0, shouldShowResults: false }
    isSavingRef.current = true

    let accuracy = 0
    if (session.questionsAnswered > 0) {
      accuracy = Math.round((session.correctAnswers / session.questionsAnswered) * 100)
    }

    let gained = 0
    // Only deduct rating if user interacted (answered/skipped at least 1)
    if (session.questionsAnswered > 0) {
      gained = -12
    }

    // 1. Update Profile Rating if needed
    let ratingBeforeLocal = 400
    let ratingAfterLocal = 400

    if (gained !== 0 && userProfile) {
      try {
        if (searchParams.get("language") === "random" || (playType as string) === "random") {
          // Identify played language
          const playedLang = session.language as keyof typeof userProfile.languageRatings
          const prev = (userProfile.languageRatings as any)[playedLang] ?? 400
          const newVal = Math.max(400, prev + gained)
          ratingBeforeLocal = prev
          ratingAfterLocal = newVal

          const updatedRatings = {
            ...userProfile.languageRatings,
            HTML: Math.max(400, userProfile.languageRatings.HTML + gained),
            CSS: Math.max(400, userProfile.languageRatings.CSS + gained),
            JavaScript: Math.max(400, userProfile.languageRatings.JavaScript + gained),
          }
          updatedRatings.overall = Math.round((updatedRatings.HTML + updatedRatings.CSS + updatedRatings.JavaScript) / 3)
          await updateUserProfile({ languageRatings: updatedRatings })
        } else {
          const lang = session.language as keyof typeof userProfile.languageRatings
          const prev = (userProfile.languageRatings as any)[lang] ?? 400
          const newVal = Math.max(400, prev + gained)
          ratingBeforeLocal = prev
          ratingAfterLocal = newVal

          const updatedRatings = {
            ...userProfile.languageRatings,
            [lang]: Math.max(400, (userProfile.languageRatings as any)[lang] + gained),
          }
          updatedRatings.overall = Math.round((updatedRatings.HTML + updatedRatings.CSS + updatedRatings.JavaScript) / 3)
          await updateUserProfile({ languageRatings: updatedRatings })
        }
      } catch (e) {
        console.error("Failed to update rating on abandonment", e)
      }
    }

    // 2. Update Game Session
    await updateGameSession(session.id, {
      endTime: true,
      status: "abandoned",
      gameOver: true,
      accuracy,
      score: session.score, // keep score even if abandoned
    }).catch(() => { })

    // 3. Create Solo Match Record (so it shows in history)
    // Only if user actually played (answered > 0)
    if (userProfile && session.questionsAnswered > 0) {
      try {
        await createSoloMatch(
          userProfile.uid,
          userProfile.username,
          session.language,
          session.questions,
          session.answers,
          session.sessionQuestions,
          session.correctAnswers,
          session.questionsAnswered,
          ratingBeforeLocal,
          ratingAfterLocal,
          gained,
          userProfile.languageRatings,
          mode as "3min" | "5min" | "survival"
        )
      } catch (e) {
        console.error("Failed to create solo match for abandonment", e)
      }
    }

    return { accuracy, gained, shouldShowResults: session.questionsAnswered > 0 }
  }

  // Initialize game session
  useEffect(() => {
    // Guard against running twice due to StrictMode or other double-calls
    if (initGameRef.current) return
    initGameRef.current = true

    const initGame = async () => {
      try {
        // Try to restore a previous session from sessionStorage first
        const lastId = sessionStorage.getItem("last_game_id")

        if (lastId) {
          const raw = sessionStorage.getItem(`current_game_${lastId}`)
          if (raw) {
            try {
              const saved = JSON.parse(raw) as LocalGameSession
              // Restore if it matches current play mode/language
              if (saved && saved.mode === mode && (saved.language === actualLanguage)) {
                if (saved.gameOver) {
                  console.log('[initGame] Found finished game, redirecting to dashboard')
                  // clear session storage for this game so it doesn't loop if they click play again
                  sessionStorage.removeItem(`current_game_${lastId}`)
                  router.replace('/dashboard')
                  return
                }

                if (!saved.gameOver) {
                  setGameSession(saved)
                  setTimeLeft(saved.timeLeft ?? modeSettings.duration)
                  setLoading(false)

                  // ensure history push for popstate handling
                  window.history.pushState({ gameActive: true }, '', window.location.href)
                  return
                }
              }
            } catch (e) {
            }
          }
        }

        let questions: Question[] = []
        // For random mode, always use balanced fetch (skip cache)
        if (language === undefined) {
          questions = await fetchBalancedRandomQuestions(format, modeSettings.maxQuestions)
        } else {
          // For specific language, try cache first
          questions = await getCachedQuestions(language, format)
          if (questions.length === 0) {
            questions = await fetchRandomQuestions(language, format, modeSettings.maxQuestions)
          }
        }

        if (questions.length === 0) {
          throw new Error("No questions available")
        }

        // Create game session in Firestore. `initGame` only runs when `user` is truthy,
        // so pass the authenticated user's uid (do not fall back to "anonymous").
        const sessionId = await createGameSession(user!.uid, mode, actualLanguage, format)
        if (!sessionId) throw new Error("Failed to create game session")

        const newSession: LocalGameSession = {
          id: sessionId,
          userId: user!.uid,
          mode: mode,
          language: actualLanguage as "HTML" | "CSS" | "JavaScript",
          score: 0,
          correctAnswers: 0,
          // totalQuestions is not used to limit play in timed mode; we track questionsAnswered instead
          totalQuestions: questions.length,
          wrongAnswers: 0,
          accuracy: 0,
          timeLeft: modeSettings.duration,
          startTime: new Date(),
          currentQuestionIndex: 0,
          answers: new Array(questions.length).fill(null),
          gameOver: false,
          format: format,
          questionsAnswered: 0,
          strikes: 0,
          status: "in_progress",
          questions: questions.slice(0, modeSettings.maxQuestions),
          sessionQuestions: questions.slice(0, modeSettings.maxQuestions).map((q) => ({
            questionId: q.id,
            correct: false,
            timeSpent: 0,
          })),
        }

        setGameSession(newSession)
        setTimeLeft(modeSettings.duration)
        setLoading(false)
        // Push state to enable popstate detection for back button
        window.history.pushState({ gameActive: true }, '', window.location.href)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game")
        setLoading(false)
      }
    }

    if (user) {
      initGame()
    }
  }, [user, actualLanguage, mode])

  // Timer logic and periodic sync
  useEffect(() => {
    if (!gameSession || gameSession.gameOver) return

    if (modeSettings.duration === -1) return // No timer for survival

    // Clear any existing timer to avoid having multiple timers
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Initialize timeLeftRef with the modeSettings duration
    timeLeftRef.current = modeSettings.duration
    setTimeLeft(modeSettings.duration)

    let lastSync = Date.now()
    timerRef.current = setInterval(() => {
      const now = Date.now()

      // Decrement the ref directly
      timeLeftRef.current -= 1
      setTimeLeft(timeLeftRef.current)

      // Sync to Firestore every 15 seconds
      if (now - lastSync >= 15000 && gameSessionRef.current) {
        lastSync = now
        updateGameSession(gameSessionRef.current.id, {
          score: gameSessionRef.current.score,
          questionsAnswered: gameSessionRef.current.questionsAnswered,
          correctAnswers: gameSessionRef.current.correctAnswers,
          timeLeft: timeLeftRef.current,
        }).catch(() => { })
      }

      // Check if time is up
      if (timeLeftRef.current <= 0) {
        console.debug('[v1] timer reached zero, ending game')
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = null
        endGame()
      }
    }, 1000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [modeSettings.duration, gameSession?.id]) // Depend on duration and gameSession ID to start timer once when session is created

  // cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    }
  }, [])

  // Check if page was reloaded during an active game (via toolbar reload button)
  useEffect(() => {
    const reloadFlag = sessionStorage.getItem('reload_triggered')

    if (reloadFlag && gameSession && !gameSession.gameOver) {
      console.log('[reload] Detected reload during active game, ending game and showing results')
      sessionStorage.removeItem('reload_triggered')

      handleAbandonment(gameSession).then(({ accuracy, gained }) => {
        setGameSession((prev) => prev ? {
          ...prev,
          gameOver: true,
          endTime: new Date(),
          accuracy,
        } : prev)
        setRatingChange(gained)
        setShowResults(true)
      })
    }
  }, [gameSession])

  // Prevent accidental navigation away from active game
  useEffect(() => {

    // On reload hotkey (F5, Ctrl+R, Cmd+R) - end game immediately and show results
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (gameSessionRef.current && !gameSessionRef.current.gameOver) {
        const isF5 = e.key === 'F5'
        const isCtrlR = (e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')
        if (isF5 || isCtrlR) {
          console.log('[keydown] Caught reload hotkey, ending game and showing results')
          e.preventDefault()
          e.stopPropagation()

          // End game immediately without showing modal (actually we show it after state update)
          const current = gameSessionRef.current

          handleAbandonment(current).then(({ accuracy, gained }) => {
            setGameSession((prev) => prev ? {
              ...prev,
              gameOver: true,
              endTime: new Date(),
              accuracy,
            } : prev)
            setRatingChange(gained)
            setShowResults(true)
          })
        }
      }
    }

    // Handle back button click (browser back)
    const handlePopState = () => {
      if (gameSessionRef.current && !gameSessionRef.current.gameOver) {
        console.log('[popstate] Back button detected')
        setExitSource("back")
        setShowConfirmExit(true)
        // Push state again to keep user on same page
        window.history.pushState({ gameActive: true }, '', window.location.href)
      }
    }

    // For toolbar reload button - save a flag and let the page reload
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (gameSessionRef.current && !gameSessionRef.current.gameOver) {
        console.log('[beforeunload] Toolbar reload detected, saving flag')
        sessionStorage.setItem('reload_triggered', 'true')
        // Don't prevent default - allow the reload to happen
      }
    }

    window.addEventListener('popstate', handlePopState)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('popstate', handlePopState)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Debug: log gameSession changes
  useEffect(() => {
    if (gameSession) {
      gameSessionRef.current = gameSession
      console.log('!!!!! GAMESESSION UPDATED !!!!!')
      console.log('  wrongAnswers:', gameSession.wrongAnswers)
      console.log('  strikes:', gameSession.strikes)
      console.log('  mode:', mode)
      console.log('  gameOver:', gameSession.gameOver)
    }
  }, [gameSession, mode])

  // Persist session to sessionStorage so a browser reload won't lose progress
  useEffect(() => {
    try {
      if (gameSession) {
        const toSave = { ...gameSession, timeLeft: timeLeftRef.current ?? timeLeft }
        sessionStorage.setItem(`current_game_${gameSession.id}`, JSON.stringify(toSave))
        sessionStorage.setItem('last_game_id', gameSession.id)
      }
    } catch (e) {
      // ignore storage errors
    }
  }, [gameSession])

  const handleAnswer = async (optionIndex: number) => {
    if (!gameSession || gameSession.gameOver) return
    // Answer flow: show feedback, update stats, then move to next question
    const currentQuestion = gameSession.questions[gameSession.currentQuestionIndex]
    const isCorrect = optionIndex === currentQuestion.correctAnswerIndex
    const newAnswers = [...gameSession.answers]
    newAnswers[gameSession.currentQuestionIndex] = optionIndex

    const newCorrect = isCorrect ? gameSession.correctAnswers + 1 : gameSession.correctAnswers
    const newWrong = isCorrect ? gameSession.wrongAnswers : gameSession.wrongAnswers + 1
    const newScore = newCorrect * 10 // 10 points per correct

    console.log('========== ANSWER HANDLER START ==========')
    console.log('isCorrect:', isCorrect)
    console.log('currentWrongAnswers:', gameSession.wrongAnswers)
    console.log('newWrong CALCULATED:', newWrong)
    console.log('mode:', mode)

    // Update session questions array (append via updateGameSession)
    const updatedSessionQuestions = [...gameSession.sessionQuestions]
    updatedSessionQuestions[gameSession.currentQuestionIndex] = {
      questionId: currentQuestion.id,
      correct: isCorrect,
      timeSpent: mode === "survival" ? 0 : modeSettings.duration - timeLeft,
    }

    // Optimistically set feedback so user sees immediate correct/wrong
    setLastResult(isCorrect ? "correct" : "wrong")
    // Increment questions answered count
    const newQuestionsAnswered = gameSession.questionsAnswered + 1

    // Logging for tracking verification
    console.log('[TRACKING] Question answered', {
      newQuestionsAnswered,
      newCorrect,
      newWrong,
      isCorrect,
      currentIndex: gameSession.currentQuestionIndex,
    })

    // Update local state immediately so bolts/strikes display updates right away
    setGameSession((prev) =>
      prev
        ? {
          ...prev,
          wrongAnswers: newWrong,
          strikes: newWrong,
          correctAnswers: newCorrect,
          score: newScore,
          questionsAnswered: newQuestionsAnswered,
          answers: newAnswers,
          accuracy: Math.round((newCorrect / Math.max(newQuestionsAnswered, 1)) * 100),
        }
        : prev,
    )
    console.log('STATE UPDATE called with newWrong:', newWrong, 'newCorrect:', newCorrect)

    // Send update to Firestore (questions appended using arrayUnion)
    updateGameSession(gameSession.id, {
      score: newScore,
      correctAnswers: newCorrect,
      strikes: newWrong,
      questions: [updatedSessionQuestions[gameSession.currentQuestionIndex]],
      questionsAnswered: newQuestionsAnswered,
      wrongAnswers: newWrong,
      accuracy: Math.round((newCorrect / Math.max(newQuestionsAnswered, 1)) * 100),
    }).catch(() => { })

    // Check survival mode: if 5 strikes reached, end game
    console.debug('[survival check] mode:', mode, 'newWrong:', newWrong, 'condition (>= 5):', newWrong >= 5)
    if (mode === "survival" && newWrong >= 5) {
      console.debug('[survival END GAME TRIGGERED] newWrong:', newWrong)
      const finalSession = {
        ...gameSession,
        answers: newAnswers,
        correctAnswers: newCorrect,
        wrongAnswers: newWrong,
        accuracy: Math.round((newCorrect / Math.max(newQuestionsAnswered, 1)) * 100),
        gameOver: true,
        endTime: new Date(),
        score: newScore,
        sessionQuestions: updatedSessionQuestions,
        strikes: newWrong,
      }

      await updateGameSession(gameSession.id, {
        endTime: true,
        status: "completed",
        score: newScore,
        correctAnswers: newCorrect,
        strikes: newWrong,
        questionsAnswered: newQuestionsAnswered,
        accuracy: Math.round((newCorrect / Math.max(newQuestionsAnswered, 1)) * 100),
        gameOver: true,
      }).catch(() => { })

      setGameSession(finalSession)
      setShowResults(true)
      setLastResult(null)
      return
    }

    // Wait briefly so user sees feedback, then advance
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(async () => {
      setLastResult(null)

      // Advance index
      const nextIndex = gameSessionRef.current!.currentQuestionIndex + 1
      console.debug('[v1] advancing question index ->', nextIndex)

      // If we're near the end of preloaded questions, fetch & append more
      // If language is "random" (undefined), use balanced fetch from all languages
      if (nextIndex >= gameSessionRef.current!.questions.length - 3) {
        let extra: Question[] = []
        if (language === undefined) {
          // Random mode: fetch balanced from all languages
          extra = await fetchBalancedRandomQuestions(format, 10)
        } else {
          // Specific language: fetch from that language
          extra = await fetchRandomQuestions(language, format, 10)
        }

        if (extra.length > 0) {
          const appendedQuestions = [...gameSessionRef.current!.questions, ...extra]
          const appendedSessionQuestions = [
            ...gameSessionRef.current!.sessionQuestions,
            ...extra.map((q) => ({ questionId: q.id, correct: false, timeSpent: 0 })),
          ]
          // Ensure answers array stays in sync with questions (fill new slots with null)
          const appendedAnswers = [...(gameSessionRef.current!.answers || []), ...new Array(extra.length).fill(null)]
          setGameSession((prev) =>
            prev
              ? {
                ...prev,
                questions: appendedQuestions,
                sessionQuestions: appendedSessionQuestions,
                answers: appendedAnswers,
                totalQuestions: appendedQuestions.length,
              }
              : prev,
          )

          // Persist appended answers + sessionQuestions to Firestore so server-side session stays in sync
          try {
            // Only send the newly created sessionQuestions items (the ones for `extra`)
            const newSessionQuestions = extra.map((q) => ({ questionId: q.id, correct: false, timeSpent: 0 }))
            updateGameSession(gameSessionRef.current!.id, {
              answers: appendedAnswers,
              questions: newSessionQuestions,
              // also update totalQuestions on server if desired
            }).catch(() => { })
          } catch (e) {
            // ignore persistence errors; local state still correct
          }
        }
      }

      // Update local state
      setGameSession((prev) =>
        prev
          ? {
            ...prev,
            answers: newAnswers,
            correctAnswers: newCorrect,
            wrongAnswers: newWrong,
            strikes: newWrong,
            score: newScore,
            currentQuestionIndex: nextIndex,
            sessionQuestions: updatedSessionQuestions,
            questionsAnswered: newQuestionsAnswered,
          }
          : prev,
      )

      // Final tracking log
      console.log('[TRACKING] State updated after answer', {
        questionsAnswered: newQuestionsAnswered,
        correctAnswers: newCorrect,
        wrongAnswers: newWrong,
        currentQuestionIndex: nextIndex,
      })
    }, 650)
  }

  const endGame = async () => {
    // Use ref to avoid stale closure in timer
    const currentSession = gameSessionRef.current
    if (!currentSession) return
    // Guard against race conditions and double-calls
    if (currentSession.gameOver || isSavingRef.current) return

    // Lock saving
    isSavingRef.current = true

    // Compute final stats
    const finalQuestionsAnswered = currentSession.questionsAnswered
    const finalCorrect = currentSession.correctAnswers
    const finalWrong = currentSession.wrongAnswers
    const accuracy = Math.round((finalCorrect / Math.max(finalQuestionsAnswered, 1)) * 100)

    await updateGameSession(currentSession.id, {
      endTime: true,
      status: "completed",
      score: currentSession.score,
      correctAnswers: finalCorrect,
      strikes: finalWrong,
      questionsAnswered: finalQuestionsAnswered,
      accuracy,
      gameOver: true,
    }).catch(() => { })

    const finalSession = {
      ...currentSession,
      gameOver: true,
      endTime: new Date(),
      accuracy,
    }

    setGameSession(finalSession)

    // Update user rating for solo mode: min 15 answered required
    // If >= 15 answered and correct > wrong: win (+6), else lose (-12)
    try {
      if (playType === "solo" && userProfile) {
        let gained = 0
        let won = false

        // Check win conditions: must have answered at least 15 questions
        if (finalQuestionsAnswered >= 15) {
          // Win if correct answers > wrong answers
          if (finalCorrect > finalWrong) {
            gained = 6
            won = true
          } else {
            gained = -12
          }
        } else {
          // Less than 15 answered: automatic loss
          gained = -12
        }

        // If language was random, apply to all languages. We'll animate the rating for the played language.
        // Capture rating snapshots for persistence
        let ratingBeforeLocal: number | null = null
        let ratingAfterLocal: number | null = null
        if (searchParams.get("language") === "random" || (playType as string) === "random") {
          // Determine which language this session used (currentSession.language)
          const playedLang = currentSession.language as keyof typeof userProfile.languageRatings
          const prev = (userProfile.languageRatings as any)[playedLang] ?? 400
          const newVal = Math.max(400, prev + gained)
          // Set rating values BEFORE showing results so modal has the data
          setPrevRatingValue(prev)
          setNewRatingValue(newVal)
          setRatingChange(gained)
          ratingBeforeLocal = prev
          ratingAfterLocal = newVal

          const updatedRatings = {
            ...userProfile.languageRatings,
            HTML: Math.max(400, userProfile.languageRatings.HTML + gained),
            CSS: Math.max(400, userProfile.languageRatings.CSS + gained),
            JavaScript: Math.max(400, userProfile.languageRatings.JavaScript + gained),
          }
          updatedRatings.overall = Math.round((updatedRatings.HTML + updatedRatings.CSS + updatedRatings.JavaScript) / 3)
          await updateUserProfile({ languageRatings: updatedRatings })
          setRatingChange(gained)
        } else {
          const lang = currentSession.language as keyof typeof userProfile.languageRatings
          const prev = (userProfile.languageRatings as any)[lang] ?? 400
          const newVal = Math.max(400, prev + gained)
          // Set rating values BEFORE showing results so modal has the data
          setPrevRatingValue(prev)
          setNewRatingValue(newVal)
          setRatingChange(gained)
          ratingBeforeLocal = prev
          ratingAfterLocal = newVal

          const updatedRatings = {
            ...userProfile.languageRatings,
            [lang]: Math.max(400, (userProfile.languageRatings as any)[lang] + gained),
          }
          updatedRatings.overall = Math.round((updatedRatings.HTML + updatedRatings.CSS + updatedRatings.JavaScript) / 3)
          await updateUserProfile({ languageRatings: updatedRatings })
        }

        // Save solo match to Firestore for match history (persist full questions, answers, per-question timing, and rating snapshots)
        try {
          const soloMatchId = await createSoloMatch(
            userProfile.uid,
            userProfile.username,
            currentSession.language,
            currentSession.questions,
            currentSession.answers,
            currentSession.sessionQuestions,
            finalCorrect,
            finalQuestionsAnswered,
            ratingBeforeLocal ?? ((userProfile.languageRatings as any)?.[currentSession.language] ?? 400),
            ratingAfterLocal ?? ((userProfile.languageRatings as any)?.[currentSession.language] ?? 400),
            gained,
            userProfile.languageRatings,
            mode as "3min" | "5min" | "survival"
          )
          console.log("[v0] Solo match saved successfully", { soloMatchId, userId: userProfile.uid, language: currentSession.language, correct: finalCorrect, answered: finalQuestionsAnswered, ratingChange: gained })
          toast({ title: "Match saved", description: `Solo match saved (id: ${soloMatchId}).` })
          // Show results modal AFTER rating and match are saved
          setShowResults(true)
        } catch (matchErr) {
          console.warn("[v0] Failed to save solo match:", matchErr)
          toast({ title: "Failed to save match", description: String(matchErr), variant: "destructive" })
          // Still show results even if match save fails
          setShowResults(true)
        }
      } else {
        // Non-solo mode: show results immediately
        setShowResults(true)
      }
    } catch (err) {
      console.warn("[v0] Failed to update user rating:", err)
      // Still show results on error
      setShowResults(true)
    }
  }

  const handleSkipQuestion = () => {
    if (!gameSession || gameSession.gameOver) return

    // Skip counts as a wrong answer
    const currentQuestion = gameSession.questions[gameSession.currentQuestionIndex]
    const newAnswers = [...gameSession.answers]
    newAnswers[gameSession.currentQuestionIndex] = null
    const newWrong = gameSession.wrongAnswers + 1
    const newQuestionsAnswered = gameSession.questionsAnswered + 1

    const updatedSessionQuestions = [...gameSession.sessionQuestions]
    updatedSessionQuestions[gameSession.currentQuestionIndex] = {
      questionId: currentQuestion.id,
      correct: false,
      timeSpent: modeSettings.duration === -1 ? 0 : modeSettings.duration - timeLeft,
    }

    setLastResult("wrong")

    // Update local state immediately so bolts/strikes display updates right away
    setGameSession((prev) =>
      prev
        ? {
          ...prev,
          wrongAnswers: newWrong,
          strikes: newWrong,
          questionsAnswered: newQuestionsAnswered,
          answers: newAnswers,
          accuracy: Math.round((prev.correctAnswers / Math.max(newQuestionsAnswered, 1)) * 100),
        }
        : prev,
    )

    updateGameSession(gameSession.id, {
      wrongAnswers: newWrong,
      strikes: newWrong,
      questions: [updatedSessionQuestions[gameSession.currentQuestionIndex]],
      questionsAnswered: newQuestionsAnswered,
      accuracy: Math.round((gameSession.correctAnswers / Math.max(newQuestionsAnswered, 1)) * 100),
    }).catch(() => { })

    // Check survival mode: if 5 strikes reached, end game
    console.debug('[survival check SKIP] mode:', mode, 'newWrong:', newWrong, 'condition (>= 5):', newWrong >= 5)
    if (mode === "survival" && newWrong >= 5) {
      console.debug('[survival END GAME TRIGGERED SKIP] newWrong:', newWrong)
      const finalSession = {
        ...gameSession,
        answers: newAnswers,
        wrongAnswers: newWrong,
        accuracy: Math.round((gameSession.correctAnswers / Math.max(newQuestionsAnswered, 1)) * 100),
        gameOver: true,
        endTime: new Date(),
        strikes: newWrong,
        questionsAnswered: newQuestionsAnswered,
        sessionQuestions: updatedSessionQuestions,
      }

      updateGameSession(gameSession.id, {
        endTime: true,
        status: "completed",
        strikes: newWrong,
        questionsAnswered: newQuestionsAnswered,
        accuracy: Math.round((gameSession.correctAnswers / Math.max(newQuestionsAnswered, 1)) * 100),
        gameOver: true,
      }).catch(() => { })

      setGameSession(finalSession)
      setShowResults(true)
      setLastResult(null)
      return
    }

    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current)
    feedbackTimeoutRef.current = setTimeout(() => {
      setLastResult(null)
      const nextIndex = gameSession.currentQuestionIndex + 1
      setGameSession({
        ...gameSession,
        answers: newAnswers,
        wrongAnswers: newWrong,
        questionsAnswered: newQuestionsAnswered,
        currentQuestionIndex: nextIndex,
        sessionQuestions: updatedSessionQuestions,
      })
    }, 650)
  }

  // Handle game end (from End Game button or exit confirmation)
  const handleEndGame = async () => {
    if (!gameSession) return
    const source = exitSource
    setShowConfirmExit(false)
    setExitSource(null)
    await endGame()
    // After game ends, navigate if user came from back button or reload
    if (source === "back") {
      router.back()
    } else if (source === "reload") {
      window.location.reload()
    }
  }

  // Handle back button click
  const handleBackClick = () => {
    console.log('[handleBackClick] CLICKED')
    console.log('  gameSession exists:', !!gameSession)
    console.log('  gameOver:', gameSession?.gameOver)

    if (gameSession && !gameSession.gameOver) {
      console.log('[handleBackClick] Game is active, showing confirmation modal')
      setExitSource("back")
      setShowConfirmExit(true)
    } else {
      console.log('[handleBackClick] Game not active or already over, navigating back')
      router.back()
    }
  }

  // Handle reload button click
  const handleReloadClick = () => {
    console.log('[handleReloadClick] CLICKED')
    console.log('  gameSession exists:', !!gameSession)
    console.log('  gameOver:', gameSession?.gameOver)

    // Always show the confirmation modal when clicking reload button during active game
    if (gameSession && !gameSession.gameOver) {
      console.log('[handleReloadClick] Game is active, showing confirmation modal')
      setExitSource("reload")
      setShowConfirmExit(true)
    } else {
      console.log('[handleReloadClick] Game not active or already over, performing immediate reload')
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary">
        <Loader2 className="h-8 w-8 animate-spin" />
      </main>
    )
  }

  if (error || !gameSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || "Game failed to load"}</AlertDescription>
        </Alert>
      </main>
    )
  }

  // Prepare resultSession for modal/review rendering
  let resultSession: GameSession | null = null
  if (gameSession) {
    resultSession = {
      id: gameSession.id,
      userId: gameSession.userId,
      mode: gameSession.mode,
      language: gameSession.language,
      format: gameSession.format,
      startTime: new Date(gameSession.startTime),
      endTime: gameSession.endTime ? new Date(gameSession.endTime) : undefined,
      score: gameSession.score,
      questionsAnswered: gameSession.questionsAnswered,
      correctAnswers: gameSession.correctAnswers,
      strikes: gameSession.wrongAnswers,
      status: gameSession.gameOver ? "completed" : "in_progress",
      questions: gameSession.sessionQuestions,
      ratingChange: ratingChange ?? undefined,
    }
  }

  const currentQuestion = gameSession.questions[gameSession.currentQuestionIndex]

  return (
    <>
      {/* Results modal overlay */}
      {showResults && resultSession && (
        <ResultsModal
          session={resultSession}
          prevRating={prevRatingValue ?? undefined}
          newRating={newRatingValue ?? undefined}
          onClose={() => setShowResults(false)}
          onReview={() => {
            setShowResults(false)
            // Navigate to dedicated review page
            router.replace(`/dashboard/play/${playType}/game/${gameSession.id}/review`)
          }}
          onPlayAgain={() => {
            const languageParam = language || "random"
            const formatParam = format || "all"
            router.push(`/dashboard/play/${playType}/setup?mode=${mode}&language=${languageParam}&format=${formatParam}`)
          }}
        />
      )}

      {/* Confirmation dialog for exit */}
      {showConfirmExit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-sm">
            <CardContent className="pt-6 space-y-4">
              <div className="text-lg font-semibold">End Game?</div>
              <p className="text-sm text-muted-foreground">
                Are you sure you want to end the game? Your progress will be saved.
              </p>
              <div className="flex gap-2 justify-end pt-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowConfirmExit(false)
                    setExitSource(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleEndGame}
                >
                  End Game
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main view: game only (review moved to separate page) */}
      <QuestionRenderer
        key={`question-${gameSession.currentQuestionIndex}-strikes-${gameSession.strikes}`}
        question={currentQuestion}
        questionIndex={gameSession.currentQuestionIndex}
        totalQuestions={gameSession.totalQuestions}
        onAnswer={handleAnswer}
        onSkip={handleSkipQuestion}
        onEnd={endGame}
        onBack={handleBackClick}
        onReload={handleReloadClick}
        timeLeft={timeLeft}
        showTimer={modeSettings.duration > 0}
        lastResult={lastResult}
        strikes={gameSession.strikes}
        mode={mode}
      />
    </>
  )
}

