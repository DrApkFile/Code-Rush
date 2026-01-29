"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { listenToChallengeStatus, getChallenge, expireChallenge, type Challenge } from "@/lib/friend-challenges"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function ChallengeWaitingPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userProfile } = useAuth()
  const { toast } = useToast()

  const challengeId = searchParams.get("challengeId")
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!challengeId || !userProfile) return

    // Load challenge
    getChallenge(challengeId).then((c) => {
      setChallenge(c)
      setLoading(false)
    })

    // Listen for acceptance/decline
    const unsubscribe = listenToChallengeStatus(challengeId, async (status, updatedChallenge) => {
      if (status === "accepted" && updatedChallenge?.matchId) {
        toast({ title: "Challenge accepted!", description: "Starting game..." })
        // Store challenge id for countdown page and redirect to countdown using the matchId
        try {
          sessionStorage.setItem('currentChallengeId', updatedChallenge.id)
        } catch (e) {
          console.warn('[v0] Could not set sessionStorage currentChallengeId', e)
        }
        // Redirect to countdown
        router.push(`/challenge/${updatedChallenge.matchId}/countdown`)
      } else if (status === "declined") {
        toast({ title: "Challenge declined", description: "Returning to friends..." })
        router.push("/dashboard/friends")
      } else if (status === "expired") {
        toast({ title: "Challenge expired", description: "No response received" })
        router.push("/dashboard/friends")
      }
    })

    return () => unsubscribe()
  }, [challengeId, userProfile, router, toast])

  // 2-minute timeout
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Expire challenge
          if (challengeId) {
            expireChallenge(challengeId)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [challengeId])

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading challenge...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="w-full max-w-7xl mx-auto p-4 flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-red-500 mb-4">Challenge not found</p>
            <Button onClick={() => router.push("/dashboard/friends")}>Back to Friends</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 flex items-center justify-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Waiting for {challenge.opponentUsername}</h2>
            <p className="text-muted-foreground">
              Challenging to a {challenge.mode} {challenge.language} match
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">Time remaining</p>
              <p className="text-5xl font-bold font-mono">{formatTime(timeLeft)}</p>
            </div>

            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>

            <p className="text-center text-sm text-muted-foreground">Waiting for friend to accept or decline...</p>
          </div>

          <Button variant="outline" className="w-full" onClick={() => router.push("/dashboard/friends")}>
            Cancel & Return
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
