"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getChallenge, acceptChallenge, listenToChallenge } from "@/lib/friend-challenges"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import FriendGameArena from "@/components/game/friend-game-arena"
import SpectatorArena from "@/components/game/spectator-arena"

export default function ChallengePage() {
  const params = useParams()
  const router = useRouter()
  const { userProfile } = useAuth()
  const challengeId = params.challengeId as string

  const [challenge, setChallenge] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [matchId, setMatchId] = useState<string | null>(null)
  const [isSpectating, setIsSpectating] = useState(false)

  useEffect(() => {
    const loadChallenge = async () => {
      try {
        const data = await getChallenge(challengeId)
        setChallenge(data)

        // Check if already accepted or in progress
        if (data?.status === "in_progress" || data?.status === "completed") {
          setAccepted(true)
          setMatchId(data.matchId)

          // If user is not creator or opponent, they're a spectator
          if (userProfile?.uid !== data.creatorId && userProfile?.uid !== data.opponentId) {
            setIsSpectating(true)
          }
        }
      } catch (error) {
        console.error("Error loading challenge:", error)
      } finally {
        setLoading(false)
      }
    }

    loadChallenge()

    // Listen to real-time updates
    const unsubscribe = listenToChallenge(challengeId, (updatedChallenge) => {
      setChallenge(updatedChallenge)
      if (updatedChallenge?.status === "in_progress") {
        setAccepted(true)
        setMatchId(updatedChallenge.matchId)

        // If user is not creator or opponent, redirect to spectate
        if (userProfile?.uid !== updatedChallenge.creatorId && userProfile?.uid !== updatedChallenge.opponentId) {
          setIsSpectating(true)
        }
      }
    })

    return () => unsubscribe()
  }, [challengeId, userProfile?.uid])

  const handleAcceptChallenge = async () => {
    if (!userProfile || !challenge) return

    try {
      setAccepting(true)
      const opponentUsername = userProfile.username || ""
      const opponentElo = userProfile.languageRatings?.overall || 400
      const opponentProfilePic = (userProfile as any).profilePicture

      const newMatchId = await acceptChallenge(
        challengeId,
        userProfile.uid,
        opponentUsername,
        opponentElo,
        opponentProfilePic,
      )
      setMatchId(newMatchId)
      setAccepted(true)

      // Store challenge id for countdown and redirect both players to countdown
      try {
        sessionStorage.setItem('currentChallengeId', challengeId)
      } catch (e) {
        console.warn('[v0] Could not set sessionStorage currentChallengeId', e)
      }
      router.push(`/challenge/${newMatchId}/countdown`)
    } catch (error) {
      console.error("Error accepting challenge:", error)
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg text-muted-foreground">Loading challenge...</p>
      </div>
    )
  }

  if (!challenge) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-lg text-muted-foreground mb-4">Challenge not found or expired</p>
          <Button onClick={() => router.push("/dashboard")}>Back to Dashboard</Button>
        </div>
      </div>
    )
  }

  // Game in progress
  if (accepted && matchId) {
    if (isSpectating) {
      return <SpectatorArena matchId={matchId} spectatorUsername={userProfile?.username || "Anonymous"} />
    }
    return <FriendGameArena matchId={matchId} />
  }

  // Waiting for acceptance
  const isCreator = userProfile?.uid === challenge.creatorId
  const isOpponent = userProfile?.uid === challenge.opponentId

  return (
    <div className="min-h-screen bg-background p-4 flex items-center justify-center">
      <div className="max-w-md w-full bg-card border border-border rounded-lg p-8 text-center space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Challenge Received!</h1>
          <p className="text-muted-foreground">{challenge.creatorUsername} challenged you to a match</p>
        </div>

        {/* Challenge Details */}
        <div className="space-y-3 bg-muted p-4 rounded-lg">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mode:</span>
            <span className="font-semibold text-foreground">{challenge.mode}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Language:</span>
            <span className="font-semibold text-foreground">{challenge.language}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Type:</span>
            <span className="font-semibold text-foreground">{challenge.isRated ? "Rated" : "Unrated"}</span>
          </div>
        </div>

        {/* Opponent Info */}
        <div className="flex items-center justify-center gap-2">
          <div className="text-center">
            <p className="font-semibold text-foreground">{challenge.creatorUsername}</p>
            <p className="text-sm text-muted-foreground">Elo: {challenge.creatorElo}</p>
          </div>
          <div className="text-muted-foreground">vs</div>
          <div className="text-center">
            <p className="font-semibold text-foreground">{userProfile?.username || "Anonymous"}</p>
            <p className="text-sm text-muted-foreground">Elo: {userProfile?.languageRatings?.JavaScript || "—"}</p>
          </div>
        </div>

        {/* Accept Button */}
        {!isCreator && !isOpponent && (
          <Button onClick={handleAcceptChallenge} disabled={accepting} size="lg" className="w-full">
            {accepting ? "Accepting..." : "Accept Challenge"}
          </Button>
        )}

        {isCreator && challenge.status === "pending" && (
          <p className="text-sm text-muted-foreground">Waiting for opponent to accept...</p>
        )}

        <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full">
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
