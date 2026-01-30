import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { requestRematchInMatch, createRematchGame, declineRematchInMatch } from "@/lib/multiplayer-queries"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Check, X as XIcon, AlertCircle, Loader2 } from "lucide-react"

interface FriendResultsModalProps {
  match: any
}

export default function FriendResultsModal({ match }: FriendResultsModalProps) {
  const router = useRouter()
  const { userProfile } = useAuth()
  const [requesting, setRequesting] = useState(false)
  const [showReview, setShowReview] = useState(false)
  const [rematchStatus, setRematchStatus] = useState<string>('')
  const [selectedReviewIndex, setSelectedReviewIndex] = useState<number | null>(null)
  const [declineRedirectCount, setDeclineRedirectCount] = useState<number | null>(null)

  const isPlayer1 = userProfile?.uid === match.player1.uid
  const playerNumber = isPlayer1 ? 1 : 2

  const player1Accuracy = match.player1.correctAnswers > 0
    ? ((match.player1.correctAnswers / (match.player1.correctAnswers + match.player1.wrongAnswers)) * 100).toFixed(1)
    : 0
  const player2Accuracy = match.player2 && match.player2.correctAnswers > 0
    ? ((match.player2.correctAnswers / (match.player2.correctAnswers + match.player2.wrongAnswers)) * 100).toFixed(1)
    : 0
  const winner = match.player1.score > (match.player2?.score || 0) ? 1 : 2

  // Redirect if new match created
  useEffect(() => {
    if (match.rematch?.newMatchId) {
      router.push(`/challenge/${match.rematch.newMatchId}/countdown`)
    }
  }, [match.rematch?.newMatchId])

  // Coordinate Rematch Creation
  useEffect(() => {
    if (match.rematch?.player1 && match.rematch?.player2 && !match.rematch.newMatchId && isPlayer1) {
      // Only Creator (P1) creates the game to avoid duplicates
      const create = async () => {
        try {
          setRematchStatus('Creating new game...')
          await createRematchGame(match.id, match)
        } catch (e) {
          console.error("Failed to create rematch", e)
        }
      }
      create()
    }
  }, [match.rematch, isPlayer1])

  // Handle Rematch Declined
  useEffect(() => {
    if (match.rematch?.declined) {
      if (iRequested) {
        // Show notification for 3 seconds then redirect
        setDeclineRedirectCount(3)
        const timer = setInterval(() => {
          setDeclineRedirectCount(prev => {
            if (prev !== null && prev <= 1) {
              clearInterval(timer)
              router.push('/dashboard')
              return 0
            }
            return prev !== null ? prev - 1 : null
          })
        }, 1000)
        return () => clearInterval(timer)
      } else if (!iRequested && !opponentRequested) {
        // I haven't requested, but match is declined (likely by me or sync)
        // If I was the one who declined, I'm already redirecting via handleDecline
      }
    }
  }, [match.rematch?.declined])

  const handleRematchClick = async () => {
    try {
      setRequesting(true)
      await requestRematchInMatch(match.id, playerNumber)
      setRematchStatus('Waiting for opponent...')
    } catch (error) {
      console.error("Error requesting rematch:", error)
      setRequesting(false)
    }
  }

  const handleDeclineRematch = async () => {
    try {
      await declineRematchInMatch(match.id)
      router.push('/dashboard')
    } catch (error) {
      console.error("Error declining rematch:", error)
      router.push('/dashboard') // Fail open to dashboard
    }
  }

  // Actions
  const opponentRequested = isPlayer1 ? match.rematch?.player2 : match.rematch?.player1
  const iRequested = isPlayer1 ? match.rematch?.player1 : match.rematch?.player2

  if (showReview) {
    const QuestionReviewModal = ({ idx }: { idx: number }) => {
      const q = match.questions[idx]
      const myAnswerIdx = isPlayer1 ? match.player1.answers[idx] : match.player2?.answers[idx]
      const oppAnswerIdx = isPlayer1 ? match.player2?.answers[idx] : match.player1.answers[idx]
      const isCorrect = myAnswerIdx === q.correctAnswerIndex

      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-card border border-border rounded-xl shadow-2xl overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-muted/30">
              <div className="text-lg font-bold">Reviewing Question {idx + 1}</div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedReviewIndex(null)}>Close</Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              <div className="mb-6">
                <div className="text-sm font-mono text-primary/70 mb-2 uppercase tracking-tight">Difficulty: {q.difficulty || "Medium"}</div>
                <div className="text-xl font-medium leading-relaxed mb-6">{q.content}</div>
                <div className="space-y-3">
                  {q.options.map((opt: string, i: number) => {
                    const isCorrectOpt = i === q.correctAnswerIndex
                    const isMyOpt = myAnswerIdx === i
                    const isOppOpt = oppAnswerIdx === i

                    let bgClass = "bg-transparent"
                    let borderClass = "border-border"
                    if (isCorrectOpt) {
                      bgClass = "bg-green-500/10"
                      borderClass = "border-green-500/50"
                    } else if (isMyOpt) {
                      bgClass = "bg-red-500/10"
                      borderClass = "border-red-500/50"
                    }

                    return (
                      <div key={i} className={`p-4 rounded-lg border-2 transition-all ${bgClass} ${borderClass}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 ${isCorrectOpt ? 'bg-green-500 text-white border-green-600' : 'bg-muted text-muted-foreground border-border'
                            }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <div className="flex-1 font-medium">{opt}</div>
                          <div className="flex flex-col items-end gap-1">
                            {isCorrectOpt && <span className="text-green-600 text-[10px] font-bold uppercase tracking-wider bg-green-100 px-2 py-0.5 rounded">Correct</span>}
                            {isMyOpt && !isCorrectOpt && <span className="text-red-600 text-[10px] font-bold uppercase tracking-wider bg-red-100 px-2 py-0.5 rounded">Your answer</span>}
                            {isOppOpt && <span className="text-primary/60 text-[9px] font-bold uppercase tracking-wider bg-primary/5 px-2 py-0.5 rounded">Opponent</span>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {q.explanation && (
                  <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary/20" />
                    <div className="text-xs font-bold text-primary/70 mb-2 uppercase tracking-widest flex items-center gap-2">
                      <span className="text-lg">💡</span> Explanation
                    </div>
                    <div className="text-sm leading-relaxed text-muted-foreground">{q.explanation}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }


    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-card border border-border rounded-lg max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-xl animate-in fade-in zoom-in duration-300">
          <div className="p-6 border-b flex justify-between items-center bg-muted/20">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Match Review</h2>
              <p className="text-sm text-muted-foreground">Click a question to see details and explanation</p>
            </div>
            <Button variant="outline" onClick={() => setShowReview(false)}>Back to Results</Button>
          </div>

          <ScrollArea className="flex-1 p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {match.questions.map((q: any, idx: number) => {
                const myAnswerIdx = isPlayer1 ? match.player1.answers[idx] : match.player2?.answers[idx]
                const isCorrect = myAnswerIdx === q.correctAnswerIndex
                const answered = myAnswerIdx !== null && myAnswerIdx !== undefined

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedReviewIndex(idx)}
                    className="border rounded-lg p-4 mb-2 bg-card cursor-pointer hover:bg-accent/50 transition-colors shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-sm">Question {idx + 1}</span>
                      <span className="text-xs text-muted-foreground">{q.difficulty || "Medium"}</span>
                    </div>
                    <div className="mb-2 text-sm text-foreground line-clamp-2">{q.content}</div>
                    <div className="flex gap-2 items-center">
                      {answered ? (
                        <span className={`text-sm font-semibold px-2 py-1 rounded ${isCorrect ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {isCorrect ? "Correct" : "Wrong"}
                        </span>
                      ) : (
                        <span className="text-sm font-semibold px-2 py-1 rounded bg-muted text-muted-foreground">Skipped</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>

          {selectedReviewIndex !== null && <QuestionReviewModal idx={selectedReviewIndex} />}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-500">
      <div className="bg-card border border-border shadow-2xl rounded-2xl p-8 max-w-md w-full space-y-8 animate-in zoom-in duration-300">
        <div className="text-center relative">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center border-4 border-background shadow-lg">
            <span className="text-3xl">🏆</span>
          </div>
          <h2 className="text-3xl font-black text-foreground mb-1 tracking-tight mt-6">Match Over!</h2>
          <p className="text-primary font-bold text-xl uppercase tracking-widest">
            {winner === 1 ? match.player1.username : match.player2?.username} <span className="text-foreground">Won</span>
          </p>
        </div>

        {/* Results Comparison */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className={`p-5 rounded-2xl text-center border-2 transition-all ${winner === 1 ? 'bg-primary/5 border-primary shadow-inner scale-105' : 'bg-muted/50 border-transparent opacity-80'}`}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{match.player1.username}</p>
              <p className="text-4xl font-black text-foreground mb-2">{match.player1.score}</p>
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${winner === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}`}>
                  {player1Accuracy}% ACC
                </span>
              </div>
            </div>

            <div className={`p-5 rounded-2xl text-center border-2 transition-all ${winner === 2 ? 'bg-primary/5 border-primary shadow-inner scale-105' : 'bg-muted/50 border-transparent opacity-80'}`}>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">{match.player2?.username || "Opponent"}</p>
              <p className="text-4xl font-black text-foreground mb-2">{match.player2?.score || 0}</p>
              <div className="flex flex-col items-center">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded ${winner === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted-foreground/20'}`}>
                  {player2Accuracy}% ACC
                </span>
              </div>
            </div>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl space-y-3 border border-border/40">
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-muted-foreground">Correct Answers</span>
              <div className="flex items-center gap-2">
                <span className="text-green-600 font-bold">{match.player1.correctAnswers}</span>
                <span className="text-xs opacity-30">vs</span>
                <span className="text-green-600 font-bold">{match.player2?.correctAnswers || 0}</span>
              </div>
            </div>
            <div className="h-px bg-border/50" />
            <div className="flex justify-between items-center text-sm font-medium">
              <span className="text-muted-foreground">Wrong / Skipped</span>
              <div className="flex items-center gap-2">
                <span className="text-red-600 font-bold">{match.player1.wrongAnswers}</span>
                <span className="text-xs opacity-30">vs</span>
                <span className="text-red-600 font-bold">{match.player2?.wrongAnswers || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4 pt-2">
          {opponentRequested && !iRequested && !match.rematch?.declined && (
            <div className="bg-primary/5 border border-primary/20 p-4 rounded-xl space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-primary" />
                <p className="text-sm font-bold text-foreground">Opponent wants a rematch!</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleRematchClick}
                  variant="default"
                  size="sm"
                  className="font-bold h-9 bg-green-600 hover:bg-green-700"
                >
                  Accept
                </Button>
                <Button
                  onClick={handleDeclineRematch}
                  variant="outline"
                  size="sm"
                  className="font-bold h-9 border-red-200 text-red-600 hover:bg-red-50"
                >
                  Decline
                </Button>
              </div>
            </div>
          )}

          {declineRedirectCount !== null && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl animate-pulse">
              <p className="text-sm font-bold text-red-600 text-center">
                Rematch Declined. Returning to dashboard in {declineRedirectCount}s...
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            {!iRequested && !match.rematch?.declined && declineRedirectCount === null ? (
              <Button
                onClick={handleRematchClick}
                className="w-full h-12 text-lg font-bold shadow-lg hover:shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                disabled={requesting}
              >
                {requesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Request Rematch"}
              </Button>
            ) : (
              <Button disabled className="w-full h-12 text-lg font-bold bg-muted text-muted-foreground">
                {match.rematch?.newMatchId ? "Joining..." : (match.rematch?.declined ? "Rematch Declined" : (rematchStatus || "Waiting for Opponent..."))}
              </Button>
            )}

            <div className="flex gap-2">
              <Button onClick={() => setShowReview(true)} variant="outline" className="flex-1 h-11 font-bold">
                Review Match
              </Button>
              <Button onClick={() => router.push("/dashboard")} variant="ghost" className="flex-1 h-11 font-bold text-muted-foreground">
                Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
