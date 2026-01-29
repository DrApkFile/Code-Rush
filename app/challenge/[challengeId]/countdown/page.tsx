"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { getChallenge, getChallengeByMatchId, type Challenge } from "@/lib/friend-challenges"
import { preloadQuestionsCache } from "@/lib/game-queries"

export default function CountdownPage() {
  const router = useRouter()
  const params = useParams()
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
      // Redirect to game (friend match route)
      router.push(`/dashboard/play/friend/${matchId}`)
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, matchId, router])

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
