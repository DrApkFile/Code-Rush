"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { requestRematch } from "@/lib/friend-challenges"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"

interface FriendResultsModalProps {
  match: any
}

export default function FriendResultsModal({ match }: FriendResultsModalProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [requesting, setRequesting] = useState(false)

  const player1Accuracy = match.player1.correctAnswers > 0 
    ? ((match.player1.correctAnswers / (match.player1.correctAnswers + match.player1.wrongAnswers)) * 100).toFixed(1)
    : 0
  const player2Accuracy = match.player2 && match.player2.correctAnswers > 0
    ? ((match.player2.correctAnswers / (match.player2.correctAnswers + match.player2.wrongAnswers)) * 100).toFixed(1)
    : 0
  const winner = match.player1.score > (match.player2?.score || 0) ? 1 : 2

  const handleRematch = async () => {
    if (!match.challengeId) return

    try {
      setRequesting(true)
      const { link } = await requestRematch(match.challengeId, userProfile?.uid!)
      router.push(link)
    } catch (error) {
      console.error("Error requesting rematch:", error)
    } finally {
      setRequesting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-lg p-8 max-w-md w-full space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-foreground mb-2">Match Complete!</h2>
          <p className="text-lg font-semibold text-primary">
            {winner === 1 ? match.player1.username : match.player2?.username} Wins!
          </p>
        </div>

        {/* Results Comparison */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">{match.player1.username}</p>
              <p className="text-2xl font-bold text-foreground">{match.player1.score}</p>
              <p className="text-xs text-muted-foreground mt-1">{player1Accuracy}% Accuracy</p>
            </div>

            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-2">{match.player2?.username || "Opponent"}</p>
              <p className="text-2xl font-bold text-foreground">{match.player2?.score || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">{player2Accuracy}% Accuracy</p>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Correct Answers:</span>
              <span className="font-semibold text-foreground">
                {match.player1.correctAnswers} vs {match.player2?.correctAnswers || 0}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Wrong Answers:</span>
              <span className="font-semibold text-foreground">
                {match.player1.wrongAnswers} vs {match.player2?.wrongAnswers || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button onClick={handleRematch} disabled={requesting} className="flex-1">
            {requesting ? "Loading..." : "Rematch"}
          </Button>
          <Button onClick={() => router.push("/dashboard")} variant="outline" className="flex-1">
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}
