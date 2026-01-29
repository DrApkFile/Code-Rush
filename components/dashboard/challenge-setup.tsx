"use client"

import React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"

interface ChallengeSetupProps {
  onSubmit: (settings: {
    opponentId?: string
    mode: "3-min" | "5-min" | "survival"
    language: "HTML" | "CSS" | "JavaScript"
    questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all"
    isRated: boolean
  }) => Promise<void>
  isLoading: boolean
  friendId?: string
  friendUsername?: string
  disabled?: boolean
}

export default function ChallengeSetup({ onSubmit, isLoading, friendId, friendUsername, disabled }: ChallengeSetupProps) {
  const { userProfile } = useAuth()
  const [mode, setMode] = useState<"3-min" | "5-min" | "survival">("3-min")
  const [language, setLanguage] = useState<"HTML" | "CSS" | "JavaScript">("JavaScript")
  const [questionFormat, setQuestionFormat] = useState<"MCQ" | "Fill in the Blank" | "Fix the Code" | "all">("all")
  const [isRated, setIsRated] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSubmit({
      opponentId: friendId,
      mode,
      language,
      questionFormat,
      isRated,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-card border border-border rounded-lg p-6">
      {/* Friend Selection - Only show if passed as prop */}
      {friendUsername && (
        <div className="p-3 bg-muted rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">Challenging:</p>
          <p className="text-lg font-semibold text-foreground">{friendUsername}</p>
        </div>
      )}

      {/* Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Game Mode</label>
        <div className="grid grid-cols-3 gap-2">
          {(["3-min", "5-min", "survival"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                mode === m
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              }`}
            >
              {m === "survival" ? "Survival" : m}
            </button>
          ))}
        </div>
      </div>

      {/* Language Selection */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Language</label>
        <div className="grid grid-cols-3 gap-2">
          {(["HTML", "CSS", "JavaScript"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setLanguage(lang)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                language === lang
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border hover:border-primary"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      {/* Question Format */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">Question Format</label>
        <select
          value={questionFormat}
          onChange={(e) => setQuestionFormat(e.target.value as any)}
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="all">All Formats</option>
          <option value="MCQ">Multiple Choice</option>
          <option value="Fill in the Blank">Fill in the Blank</option>
          <option value="Fix the Code">Fix the Code</option>
        </select>
      </div>

      {/* Rated Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="rated"
          checked={isRated}
          onChange={(e) => setIsRated(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="rated" className="text-sm font-medium text-foreground cursor-pointer">
          Rated Match (affects Elo rating)
        </label>
      </div>

      {/* Submit Button */}
      <Button type="submit" disabled={isLoading || disabled} className="w-full">
        {isLoading ? "Creating..." : disabled ? "Friend Offline" : "Create Challenge"}
      </Button>
    </form>
  )
}
