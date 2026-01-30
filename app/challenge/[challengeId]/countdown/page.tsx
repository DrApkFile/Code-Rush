"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { getChallenge, getChallengeByMatchId, type Challenge } from "@/lib/friend-challenges"
import { preloadQuestionsCache } from "@/lib/game-queries"
import { useAuth } from "@/lib/auth-context"
import { updateMatchPlayerReady } from "@/lib/multiplayer-queries"

export default function CountdownPage() {
  const router = useRouter()
  const params = useParams()
  const { userProfile } = useAuth()
  const matchId = params.challengeId as string

  const [countdown, setCountdown] = useState(3)
  const [loading, setLoading] = useState(true)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [questionsLoaded, setQuestionsLoaded] = useState(false)

  useEffect(() => {
    const init = async () => {
      // Try to load the challenge details. Prefer sessionStorage.challengeId, fallback to finding challenge by matchId (URL param)
      const matchIdFromUrl = params.challengeId as string
      let challengeIdFromStorage: string | null = null
      try {
        challengeIdFromStorage = sessionStorage.getItem("currentChallengeId")
      } catch (e) {
        console.warn('[v0] Could not read sessionStorage currentChallengeId', e)
      }

      let c = null
      if (challengeIdFromStorage) {
        c = await getChallenge(challengeIdFromStorage)
      } else {
        // Try to find challenge by matchId
        c = await getChallengeByMatchId(matchIdFromUrl)
      }

      setChallenge(c)

      // Start preloading questions
      if (c) {
        // Use the game's caching helper which stores questions in sessionStorage/IndexedDB
        const format = c.questionFormat === "all" ? undefined : (c.questionFormat as any)
        const questions = await preloadQuestionsCache(c.language, format, 20)
        console.log(`[v0] Preloaded ${questions.length} questions during countdown`)
        setQuestionsLoaded(true)
      }
      setLoading(false)
    }

    init()
  }, [])

  useEffect(() => {
    if (countdown === 0) {
      // Set flag to avoid re-redirecting to countdown
      try {
        sessionStorage.setItem(`countdown_seen_${matchId}`, "true")
      } catch (e) { }

      // Redirect to challenge page which will now render the arena
      router.push(`/challenge/${matchId}`)
      return
    }

    const timer = setTimeout(() => {
      const nextValue = countdown - 1
      setCountdown(nextValue)

      // Optimization: Mark player as ready when countdown reaches 1
      // so by the time they land in the Arena, the readiness has likely synced.
      if (nextValue === 1 && challenge && userProfile) {
        const isPlayer1 = userProfile.uid === challenge.creatorId
        const matchDocId = challenge.matchId
        if (matchDocId) {
          console.log('[Countdown] Pre-marking player ready...')
          updateMatchPlayerReady(matchDocId, isPlayer1 ? 1 : 2, true).catch(() => { })
        }
      }
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, matchId, router, challenge, userProfile])

  return (
    <div className="w-full max-w-7xl mx-auto p-4 flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 to-primary/5">
      <Card className="w-full max-w-md border-2">
        <CardContent className="p-12 text-center space-y-6">
          <div>
            <p className="text-muted-foreground text-lg mb-4">Get ready!</p>
            <div className="text-8xl font-bold text-primary font-mono mb-4 animate-pulse">{countdown}</div>
            <p className="text-muted-foreground">Game starting...</p>
          </div>

          {questionsLoaded && <p className="text-sm text-green-600">✓ Questions preloaded</p>}

          {challenge && (
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>{challenge.mode}</strong> • <strong>{challenge.language}</strong>
              </p>
              <p>vs <strong>{challenge.opponentUsername}</strong></p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
