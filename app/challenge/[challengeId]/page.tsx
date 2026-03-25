"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getChallenge, acceptChallenge, listenToChallenge, type Challenge } from "@/lib/friend-challenges"
import { useAuth } from "@/lib/auth-context"
import { getMatch } from "@/lib/multiplayer-queries"
import { Button } from "@/components/ui/button"
import FriendGameArena from "@/components/game/friend-game-arena"
import SpectatorArena from "@/components/game/spectator-arena"
import { Copy, Check, Loader2, AlertCircle } from "lucide-react"

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
  const [copied, setCopied] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    if (!challengeId) return
    console.log('[Challenge] Starting listener for:', challengeId)
    setLoading(true)

    const unsubscribe = listenToChallenge(challengeId, (data) => {
      if (!data) {
        console.log('[Challenge] No data returned from listener. Checking Match fallback...')

        // Match-as-Challenge fallback (Rematches)
        getMatch(challengeId).then((matchData) => {
          if (matchData) {
            console.log('[Challenge] Found Match for ID fallback:', matchData.id)
            const pseudoChallenge: Challenge = {
              id: matchData.id,
              creatorId: matchData.player1.uid,
              creatorUsername: matchData.player1.username,
              creatorElo: matchData.player1.languageRatings?.JavaScript || 1200,
              creatorProfilePic: matchData.player1.profilePicture,
              opponentId: matchData.player2?.uid || '',
              opponentUsername: matchData.player2?.username,
              mode: (matchData.challengeMode || matchData.mode || '3-min') as any,
              language: matchData.language,
              questionFormat: 'all',
              isRated: matchData.isRated,
              status: 'in_progress',
              matchId: matchData.id,
              createdAt: matchData.createdAt,
              expiresAt: matchData.createdAt + (24 * 60 * 60 * 1000)
            } as Challenge

            // Derive spectator status for fallback
            if (userProfile && userProfile.uid !== matchData.player1.uid && userProfile.uid !== matchData.player2?.uid) {
              setIsSpectating(true)
            }

            setChallenge(pseudoChallenge)
            setAccepted(true)
            setMatchId(matchData.id)
            setLoading(false)
          } else {
            console.log('[Challenge] No challenge or match found for:', challengeId)
            setChallenge(null)
            setLoading(false)
          }
        }).catch((err) => {
          console.error('[Challenge] Error in Match fallback:', err)
          setLoading(false)
        })
        return
      }

      console.log('[Challenge] Data received from listener:', {
        id: data.id,
        status: data.status,
        matchId: data.matchId
      })

      const hasSeenCountdown = sessionStorage.getItem(`countdown_seen_${challengeId}`)
      const isParticipant = userProfile?.uid === data.creatorId || userProfile?.uid === data.opponentId

      // Handle transitions before setting challenge to avoid flashes
      if (data.status === "in_progress" && isParticipant && !hasSeenCountdown) {
        console.log('[Challenge] Auto-redirecting to countdown...')
        router.push(`/challenge/${challengeId}/countdown`)
        return
      }

      setChallenge(data)
      setLoading(false)

      if (data.status === "in_progress" || data.status === "accepted" || data.status === "completed") {
        setAccepted(true)
        setMatchId(data.matchId || null)

        if (userProfile && userProfile.uid !== data.creatorId && userProfile.uid !== data.opponentId) {
          setIsSpectating(true)
        }
      }
    })

    return () => {
      console.log('[Challenge] Unsubscribing from listener')
      unsubscribe()
    }
  }, [challengeId, userProfile?.uid, router])

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
        userProfile.languageRatings,
        opponentProfilePic,
      )
      setMatchId(newMatchId || null)
      setAccepted(true)

      // Store challenge id for countdown and redirect both players to countdown
      try {
        sessionStorage.setItem('currentChallengeId', challengeId)
      } catch (e) {
        console.warn('[v0] Could not set sessionStorage currentChallengeId', e)
      }
      router.push(`/challenge/${challengeId}/countdown`)
    } catch (error) {
      console.error("Error accepting challenge:", error)
    } finally {
      setAccepting(false)
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/challenge/${challengeId}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Derived game state
  const gameInProgress = (accepted && !!matchId) || (challenge?.status === "in_progress" || challenge?.status === "completed")

  // Log render state for debugging
  console.log('[Challenge] Render State:', {
    loading,
    hasChallenge: !!challenge,
    status: challenge?.status,
    matchId,
    accepted,
    gameInProgress,
    isSpectating
  })

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
        <div className="max-w-md w-full p-8 text-center space-y-4">
          <div className="flex justify-center">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Challenge Not Found</h1>
          <p className="text-muted-foreground">
            This challenge might have expired (they last 24 hours), been canceled, or the link is incorrect.
          </p>
          <div className="pt-4 flex flex-col gap-2">
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Back to Dashboard
            </Button>
            <Button variant="ghost" onClick={() => window.location.reload()} className="w-full">
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Game in progress - Use more robust detection for rematches
  if (gameInProgress) {
    // Priority: internal matchId -> challenge metadata -> URL parameter (for rematches)
    const activeMatchId = matchId || challenge?.matchId || challengeId

    if (activeMatchId) {
      console.log('[Challenge] Rendering Arena:', activeMatchId)
      if (isSpectating) {
        return <SpectatorArena matchId={activeMatchId} spectatorUsername={userProfile?.username || "Anonymous"} />
      }
      return <FriendGameArena matchId={activeMatchId} />
    }
  }

  // Waiting for acceptance
  const isCreator = userProfile?.uid === challenge.creatorId
  const isOpponent = userProfile?.uid === challenge.opponentId

  if (isCreator && challenge.status === "pending") {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-2xl w-full space-y-8">
          {/* Header section inspired by Lichess */}
          <div className="bg-card border border-border rounded-xl p-8 shadow-sm">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="p-4 bg-primary/10 rounded-2xl">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <div className="flex-1 text-center md:text-left space-y-1">
                <h1 className="text-3xl font-bold tracking-tight">Challenge Created</h1>
                <p className="text-muted-foreground text-lg">Waiting for an opponent to join your match...</p>
              </div>
              <div className="px-6 py-3 bg-muted rounded-full">
                <span className="text-sm font-semibold text-primary uppercase tracking-wider">{challenge.mode}</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-sm font-medium">{challenge.language}</span>
                <span className="mx-2 text-muted-foreground">|</span>
                <span className="text-sm font-medium">{challenge.isRated ? "Casual" : "Training"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Link Sharing Box */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                Invite someone to play
              </h3>
              <p className="text-sm text-muted-foreground">The first person to open this URL will play with you.</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/challenge/${challengeId}`}
                    className="w-full px-4 py-3 text-sm bg-muted border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <Button onClick={handleCopyLink} size="icon" className="h-12 w-12 shrink-0">
                  {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Status / Game Info */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="text-4xl">🎲</div>
                <h3 className="font-semibold text-lg">Matchmaking Info</h3>
                <p className="text-sm text-muted-foreground">Your Rating: {challenge.creatorElo}</p>
              </div>
              <Button onClick={() => router.push("/dashboard")} variant="outline" className="mt-2">
                Cancel Challenge
              </Button>
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-muted-foreground">
              Challenges expire automatically after 24 hours if not accepted.
            </p>
          </div>
        </div>
      </div>
    )
  }

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

        {/* Accept Button or Login CTA */}
        {!userProfile ? (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3 rounded-lg text-sm text-amber-800 dark:text-amber-200 mb-4">
              You need an account to accept this challenge.
            </div>
            <Button onClick={() => router.push(`/signup?redirect=/challenge/${challengeId}`)} size="lg" className="w-full">
              Sign up to Play
            </Button>
            <Button onClick={() => router.push(`/login?redirect=/challenge/${challengeId}`)} variant="ghost" size="sm" className="w-full">
              Already have an account? Login
            </Button>
          </div>
        ) : !isCreator && !isOpponent && (
          <Button onClick={handleAcceptChallenge} disabled={accepting} size="lg" className="w-full">
            {accepting ? "Accepting..." : "Accept Challenge"}
          </Button>
        )}

        <Button onClick={() => router.push("/dashboard")} variant="outline" className="w-full">
          Back to Dashboard
        </Button>
      </div>
    </div>
  )
}
