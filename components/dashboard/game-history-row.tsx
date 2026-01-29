"use client"

import React from "react"
import { useRouter } from "next/navigation"
import type { GameSession } from "@/lib/game-queries"
import { Check, X } from "lucide-react"

interface Props {
  game: GameSession
  currentRating?: number | null
  matchId?: string
}

export default function GameHistoryRow({ game, currentRating, matchId }: Props) {
  const router = useRouter()
  
  const handleClick = () => {
    if (matchId) {
      router.push(`/dashboard/match/${matchId}`)
    }
  }
  // Map language to explicit root PNG filenames requested by user
  const languageKey = (game.language || "JavaScript").toString()
  const languageImage = (() => {
    const key = languageKey.toLowerCase()
    if (key === "html") return "/languages/html.png"
    if (key === "css") return "/languages/css.png"
    // support both 'javascript' and 'js'
    if (key === "javascript" || key === "js") return "/languages/js.png"
    // fallback to generic js if unknown
    return "/languages/js.png"
  })()

  const ratingChange = (game as any).ratingChange ?? 0

  // Approximate rating at the time by subtracting the session ratingChange from the current rating
  const current = typeof currentRating === "number" ? currentRating : 400
  const ratingAtTime = Math.max(400, current - ratingChange)

  // In solo mode a "win" is defined by a positive rating change
  const won = ratingChange > 0

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 py-2 px-3 hover:bg-accent/40 rounded cursor-pointer transition-colors"
    >
      <img
        src={languageImage}
        onError={(e) => ((e.target as HTMLImageElement).src = "/placeholder.jpg")}
        alt={languageKey}
        className="w-10 h-10 rounded-md object-cover"
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 truncate">
            <span className="text-sm font-medium truncate">{languageKey}</span>
          </div>

          <div className="text-sm text-muted-foreground">{game.mode}</div>
        </div>

        <div className="flex items-center justify-between mt-1">
          <div className="text-xs text-muted-foreground">
            Rating: <span className="font-semibold text-foreground">{ratingAtTime}</span>
          </div>

          <div>
            {won ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-600 text-white text-sm font-semibold">Win</span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-600 text-white text-sm font-semibold">Loss</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
