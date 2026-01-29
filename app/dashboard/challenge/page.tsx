"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, useSearchParams } from "next/navigation"
import { createFriendChallenge } from "@/lib/friend-challenges"
import ChallengeSetup from "@/components/dashboard/challenge-setup"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { getUserFriends, listenToFriendStatus, type Friend, type UserStatus } from "@/lib/friends-queries"

export default function ChallengePage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const friendId = searchParams.get("friendId")
  const [showSetup, setShowSetup] = useState(!friendId) // If friendId provided, show setup immediately
  const [loading, setLoading] = useState(false)
  const [friend, setFriend] = useState<Friend | null>(null)
  const [friendStatus, setFriendStatus] = useState<UserStatus | null>(null)

  // Load friend info if friendId in params
  useEffect(() => {
    if (!friendId || !userProfile) return

    const loadFriend = async () => {
      const friends = await getUserFriends(userProfile.uid)
      const found = friends.find((f) => f.friendId === friendId)
      if (found) {
        setFriend(found)
      }
    }

    loadFriend()

    // Listen to friend's online status
    if (friendId) {
      const unsubscribe = listenToFriendStatus(friendId, (status) => {
        setFriendStatus(status)
      })
      return () => unsubscribe()
    }
  }, [friendId, userProfile])

  const handleCreateChallenge = async (settings: {
    opponentId?: string
    mode: "3-min" | "5-min" | "survival"
    language: "HTML" | "CSS" | "JavaScript"
    questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all"
    isRated: boolean
  }) => {
    if (!userProfile) return

    try {
      setLoading(true)
      const result = await createFriendChallenge(
        userProfile.uid,
        userProfile.username,
        userProfile.languageRatings?.overall || 400,
        userProfile.profilePicture,
        settings.opponentId || friendId || "",
        friend?.friendUsername || "",
        settings.mode,
        settings.language,
        settings.questionFormat,
        settings.isRated,
      )

      if (result.error) {
        toast({ title: "Error", description: result.error })
        return
      }

      // Store challenge ID for waiting room
      sessionStorage.setItem("currentChallengeId", result.challengeId)

      toast({ title: "Challenge sent!", description: "Waiting for friend to respond..." })
      router.push(`/dashboard/challenge/waiting?challengeId=${result.challengeId}`)
    } catch (error) {
      console.error("Error creating challenge:", error)
      toast({ title: "Error", description: "Failed to create challenge" })
    } finally {
      setLoading(false)
    }
  }

  const isOnline = friendStatus?.status === "online"
  const isInGame = friendStatus?.status === "in-game"

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Challenge a Friend</h2>
        <p className="text-muted-foreground">
          {friend ? `Challenge ${friend.friendUsername}` : "Create a custom challenge"}
        </p>
      </div>

      {friendId && friend && !isOnline && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-700">
            {isInGame ? `${friend.friendUsername} is currently in-game` : `${friend.friendUsername} is offline`}. They won't be
            able to accept immediately.
          </p>
        </div>
      )}

      {showSetup && (
        <ChallengeSetup
          onSubmit={handleCreateChallenge}
          isLoading={loading}
          friendId={friendId || undefined}
          friendUsername={friend?.friendUsername}
          disabled={friendId && !isOnline}
        />
      )}

      {!showSetup && (
        <Button onClick={() => setShowSetup(true)} size="lg" className="w-full">
          Create Challenge
        </Button>
      )}
    </div>
  )
}
