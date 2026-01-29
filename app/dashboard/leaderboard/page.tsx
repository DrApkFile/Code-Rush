"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard-queries"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

type Language = "HTML" | "CSS" | "JavaScript"
type TimeRange = "all-time" | "month" | "week" | "today"

export default function LeaderboardPage() {
  const { userProfile } = useAuth()
  const [language, setLanguage] = useState<Language>("JavaScript")
  const [timeRange, setTimeRange] = useState<TimeRange>("all-time")
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)
  const [lastVisible, setLastVisible] = useState<any>(null)

  useEffect(() => {
    loadLeaderboard()
  }, [language, timeRange])

  const loadLeaderboard = async () => {
    try {
      setLoading(true)
      setError(null)
      setCurrentPage(0)
      setLastVisible(null)

      const result = await fetchLeaderboard(language, timeRange)
      setEntries(result.entries)
      setHasNextPage(result.hasNextPage)
      setLastVisible(result.nextPageCursor)
    } catch (err) {
      console.error("[v0] Leaderboard error:", err)
      setError("Failed to load leaderboard")
    } finally {
      setLoading(false)
    }
  }

  const loadNextPage = async () => {
    if (!hasNextPage || !lastVisible) return

    try {
      setLoading(true)
      const result = await fetchLeaderboard(language, timeRange, currentPage + 1, lastVisible)
      setEntries((prev) => [...prev, ...result.entries])
      setHasNextPage(result.hasNextPage)
      setLastVisible(result.nextPageCursor)
      setCurrentPage((prev) => prev + 1)
    } catch (err) {
      console.error("[v0] Pagination error:", err)
      setError("Failed to load more entries")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full p-8 overflow-auto bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">Compete with players worldwide</p>
        </div>

        {/* Language Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["HTML", "CSS", "JavaScript"] as Language[]).map((lang) => (
            <Button
              key={lang}
              variant={language === lang ? "default" : "outline"}
              onClick={() => setLanguage(lang)}
              className="px-4"
            >
              {lang}
            </Button>
          ))}
        </div>

        {/* Time Range Filters */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["today", "week", "month", "all-time"] as TimeRange[]).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? "default" : "outline"}
              onClick={() => setTimeRange(range)}
              className="px-4"
              size="sm"
            >
              {range === "all-time"
                ? "All Time"
                : range === "today"
                  ? "Today"
                  : range === "week"
                    ? "This Week"
                    : "This Month"}
            </Button>
          ))}
        </div>

        {/* Leaderboard Table */}
        <Card className="border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-foreground">{language} Rankings</CardTitle>
            <CardDescription>{entries.length} entries loaded</CardDescription>
          </CardHeader>
          <CardContent>
            {error && <div className="text-destructive mb-4 p-3 bg-destructive/10 rounded">{error}</div>}

            {loading && entries.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No leaderboard data available</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Rank</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Player</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Rating</th>
                      <th className="text-left py-3 px-4 font-semibold text-foreground">Category</th>
                      <th className="text-right py-3 px-4 font-semibold text-foreground">Matches</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((entry, idx) => (
                      <tr key={entry.uid} className="border-b border-border hover:bg-muted/50 transition-colors">
                        <td className="py-4 px-4">
                          <span className="font-bold text-foreground">
                            {currentPage * 20 + idx + 1}
                            {currentPage === 0 && idx < 3 ? (
                              <span className="ml-2 text-lg">{idx === 0 ? "🥇" : idx === 1 ? "🥈" : "🥉"}</span>
                            ) : null}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            {entry.profilePicture && (
                              <Image
                                src={entry.profilePicture || "/placeholder.svg"}
                                alt={entry.username}
                                width={40}
                                height={40}
                                className="rounded-full w-10 h-10 object-cover"
                              />
                            )}
                            <span
                              className={`font-medium ${
                                entry.uid === userProfile?.uid ? "text-primary font-bold" : "text-foreground"
                              }`}
                            >
                              {entry.username}
                              {entry.uid === userProfile?.uid && " (You)"}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="font-bold text-foreground">{entry.rating}</span>
                        </td>
                        <td className="py-4 px-4 text-muted-foreground">{entry.category}</td>
                        <td className="py-4 px-4 text-right text-muted-foreground">{entry.matchesPlayed || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {entries.length > 0 && (
              <div className="mt-6 flex justify-center">
                <Button
                  onClick={loadNextPage}
                  disabled={!hasNextPage || loading}
                  variant="outline"
                  className="px-6 bg-transparent"
                >
                  {loading ? "Loading..." : hasNextPage ? "Load More" : "No More Entries"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
