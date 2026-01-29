              "use client"

              import { useState, useEffect } from "react"
              import { Button } from "@/components/ui/button"
              import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
              import type { GameSession } from "@/lib/game-queries"
              import { X, TrendingUp, TrendingDown } from "lucide-react"

              interface ResultsModalProps {
                session: GameSession
                onClose: () => void
                onReview?: () => void
                onPlayAgain?: () => void
                // Optional: previous and new rating to animate between absolute values
                prevRating?: number
                newRating?: number
              }

              export default function ResultsModal({ session, onClose, onReview, onPlayAgain, prevRating, newRating }: ResultsModalProps) {
                const [loading, setLoading] = useState(false)
                const [animatedRating, setAnimatedRating] = useState<number>(0)
                const [showAnimation, setShowAnimation] = useState(false)

                const timeSpent = session.endTime ? Math.floor((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 1000) : 0
                const correctPercentage = Math.round((session.correctAnswers / Math.max(session.questionsAnswered || 1, 1)) * 100)
                const ratingChange = session.ratingChange ?? 0

                // Animate rating on mount. If prev/new props provided, animate absolute rating value.
                useEffect(() => {
                  const hasAbsolute = typeof prevRating === 'number' && typeof newRating === 'number'
                  if (hasAbsolute) {
                    const prev = prevRating as number
                    const next = newRating as number
                    if (prev === next) return
                    setShowAnimation(true)
                    const delta = next - prev
                    const step = delta > 0 ? 1 : -1
                    const steps = Math.abs(delta)
                    const duration = Math.max(600, Math.min(1500, steps * 8)) // clamp duration
                    const stepDuration = duration / Math.max(steps, 1)
                    let current = prev
                    setAnimatedRating(current)
                    const interval = setInterval(() => {
                      current += step
                      setAnimatedRating(current)
                      if ((step > 0 && current >= next) || (step < 0 && current <= next)) {
                        clearInterval(interval)
                        setAnimatedRating(next)
                      }
                    }, stepDuration)
                    return () => clearInterval(interval)
                  } else if (ratingChange !== 0) {
                    setShowAnimation(true)
                    let currentValue = 0
                    const targetValue = ratingChange
                    const increment = targetValue > 0 ? 1 : -1
                    const steps = Math.abs(targetValue)
                    const stepDuration = 1500 / Math.max(steps, 1) // 1.5 seconds total animation

                    const interval = setInterval(() => {
                      currentValue += increment
                      setAnimatedRating(currentValue)
                      if (Math.abs(currentValue) >= Math.abs(targetValue)) {
                        clearInterval(interval)
                        setAnimatedRating(targetValue)
                      }
                    }, stepDuration)

                    return () => clearInterval(interval)
                  }
                }, [prevRating, newRating, ratingChange])

                const handleReplay = async () => {
                  setLoading(true)
                  if (onPlayAgain) {
                    onPlayAgain()
                  } else {
                    onClose()
                  }
                }

                const handleClose = () => {
                  // X button goes to review (or review modal)
                  if (onReview) {
                    onReview()
                  } else {
                    onClose()
                  }
                }

                return (
                  <div className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center p-4 z-50">
                    <Card className="w-full max-w-md sm:max-w-lg mx-auto">
                      <div className="flex justify-end p-2">
                        <button aria-label="Close" onClick={handleClose} className="p-2 rounded hover:bg-muted">
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <CardHeader className="text-center space-y-2 pt-0">
                        <CardTitle className="text-2xl">Game Over</CardTitle>
                        <CardDescription>Here's how you performed</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Compact Stats Row */}
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-foreground">{session.score}</div>
                            <div className="text-xs text-muted-foreground">Points</div>
                          </div>
                          <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-foreground">{correctPercentage}%</div>
                            <div className="text-xs text-muted-foreground">Accuracy</div>
                          </div>
                          <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-foreground">{session.correctAnswers}</div>
                            <div className="text-xs text-muted-foreground">Correct</div>
                          </div>
                          <div className="bg-card border border-border rounded-lg p-3 text-center">
                            <div className="text-xl font-bold text-foreground">{session.questionsAnswered}</div>
                            <div className="text-xs text-muted-foreground">Answered</div>
                          </div>
                        </div>

                        {/* Rating Change or Rating animation to current value */}
                        {(ratingChange !== 0 || (typeof prevRating === 'number' && typeof newRating === 'number' && prevRating !== newRating)) && (
                          <div className={`p-4 rounded-lg text-center border-2 ${((typeof prevRating === 'number' && typeof newRating === 'number') ? (newRating! > prevRating! ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200') : (ratingChange > 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'))}`}>
                            <div className="flex items-center justify-center gap-2 mb-1">
                              {((typeof prevRating === 'number' && typeof newRating === 'number') ? (newRating! > prevRating!) : (ratingChange > 0)) ? (
                                <TrendingUp className="h-5 w-5 text-green-600" />
                              ) : (
                                <TrendingDown className="h-5 w-5 text-red-600" />
                              )}
                              <span className={`text-sm font-semibold ${((typeof prevRating === 'number' && typeof newRating === 'number') ? (newRating! > prevRating!) : (ratingChange > 0)) ? 'text-green-600' : 'text-red-600'}`}>
                                {typeof prevRating === 'number' && typeof newRating === 'number' ? 'Rating' : 'Rating Change'}
                              </span>
                            </div>
                            <div className={`text-3xl font-bold ${((typeof prevRating === 'number' && typeof newRating === 'number') ? (newRating! > prevRating!) : (ratingChange > 0)) ? 'text-green-600' : 'text-red-600'}`}>
                              {typeof prevRating === 'number' && typeof newRating === 'number' ? `${animatedRating}` : (animatedRating > 0 ? '+' : '') + `${animatedRating}`}
                            </div>
                            {typeof prevRating === 'number' && typeof newRating === 'number' && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {newRating! > prevRating! ? '+' : ''}{newRating! - prevRating!} from {prevRating}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          <Button onClick={handleReplay} className="flex-1" disabled={loading}>
                            {loading ? "Loading..." : "Play Again"}
                          </Button>
                          <Button onClick={() => onReview ? onReview() : onClose()} variant="outline" className="flex-1 bg-transparent">
                            Review Questions
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )
              }
