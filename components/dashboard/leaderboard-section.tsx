"use client"

import { useState, useEffect } from "react"
import { fetchLeaderboard, type LeaderboardEntry } from "@/lib/leaderboard-queries"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

type Language = "HTML" | "CSS" | "JavaScript"
type TimeRange = "all-time" | "month" | "week" | "today"

export default function LeaderboardSection() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [language, setLanguage] = useState<Language>("JavaScript")
  const [timeRange, setTimeRange] = useState<TimeRange>("all-time")
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasNextPage, setHasNextPage] = useState(false)
  const [lastVisible, setLastVisible] = useState<any>(null)

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      try {
        const { entries, hasNextPage: newHasNextPage, nextPageCursor } = await fetchLeaderboard(
          language,
          timeRange,
          page,
          page === 0 ? undefined : lastVisible,
        )
        setLeaderboard(entries)
        setHasNextPage(newHasNextPage)
        setLastVisible(nextPageCursor)
      } catch (error) {
        console.error("[v0] Error fetching leaderboard:", error)
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [language, timeRange, page])

  const handleNextPage = () => {
    if (hasNextPage) {
      setPage((prev) => prev + 1)
    }
  }

  const handlePrevPage = () => {
    setPage((prev) => Math.max(0, prev - 1))
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Leaderboard</h2>
        <p className="text-muted-foreground">Top rated players on CodeRush</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 md:gap-4 flex-wrap">
        <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="JavaScript">JavaScript</SelectItem>
            <SelectItem value="HTML">HTML</SelectItem>
            <SelectItem value="CSS">CSS</SelectItem>
          </SelectContent>
        </Select>

        <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Time Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all-time">All Time</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="today">Today</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Leaderboard Table */}
      <Card>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Matches</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((entry, index) => (
                <TableRow key={entry.uid}>
                  <TableCell className="font-medium">{page * 20 + index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <img
                        src={entry.profilePicture || "/placeholder-user.jpg"}
                        alt={entry.username}
                        className="w-8 h-8 rounded-full"
                      />
                      <span className="font-medium">{entry.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>{entry.rating}</TableCell>
                  <TableCell>{entry.category}</TableCell>
                  <TableCell className="text-right">{entry.matchesPlayed || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Pagination */}
      <div className="flex justify-end gap-2">
        <Button onClick={handlePrevPage} disabled={page === 0 || loading}>
          Previous
        </Button>
        <Button onClick={handleNextPage} disabled={!hasNextPage || loading}>
          Next
        </Button>
      </div>
    </div>
  )
}