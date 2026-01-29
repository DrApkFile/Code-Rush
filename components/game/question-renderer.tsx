"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Code2 } from "lucide-react"
import { Question } from "@/lib/game-queries"

interface QuestionRendererProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  onAnswer: (optionIndex: number) => void
  onSkip: () => void
  onEnd: () => void
  onBack?: () => void
  onReload?: () => void
  timeLeft?: number
  showTimer?: boolean
  lastResult?: "correct" | "wrong" | null
  strikes?: number
  mode?: "3min" | "5min" | "survival"
}

export default function QuestionRenderer({
  question,
  questionIndex,
  totalQuestions,
  onAnswer,
  onSkip,
  onEnd,
  onBack,
  onReload,
  timeLeft,
  showTimer = true,
  lastResult = null,
  strikes = 0,
  mode = "3min",
}: QuestionRendererProps) {
  // Debug log strikes
  console.log('*** QUESTION RENDERER RENDER ***')
  console.log('  strikes prop:', strikes)
  console.log('  mode prop:', mode)
  console.log('  5 - strikes =', 5 - strikes)
  // For time-based mode we don't show a progress bar or question count
  const progress = 0

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "Medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "Hard":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return ""
    }
  }

  const formatTimeDisplay = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${String(secs).padStart(2, "0")}`
  }

  const renderQuestionContent = () => {
    switch (question.format) {
      case "MCQ":
        return renderMCQ()
      case "Fill in the Blank":
        return renderFillInTheBlank()
      case "Fix the Code":
        return renderFixTheCode()
      default:
        return null
    }
  }

  const renderMCQ = () => (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-foreground">{question.content}</p>
      {lastResult && (
        <div
          className={`px-3 py-2 rounded-md text-sm font-semibold ${
            lastResult === "correct" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {lastResult === "correct" ? "Correct" : "Fail"}
        </div>
      )}
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            disabled={!!lastResult}
            className="w-full text-left p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-card/80 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current text-sm font-semibold flex-shrink-0 mt-0.5">
                {String.fromCharCode(65 + index)}
              </div>
              <span className="font-medium leading-relaxed">{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderFillInTheBlank = () => (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-foreground leading-relaxed">
        {question.content.split("___").map((part, idx) => (
          <span key={idx}>
            {part}
            {idx < question.content.split("___").length - 1 && (
              <span className="inline-block px-3 py-1 mx-1 bg-primary/20 border-b-2 border-primary text-primary font-semibold rounded">
                ___
              </span>
            )}
          </span>
        ))}
      </p>
      {lastResult && (
        <div
          className={`px-3 py-2 rounded-md text-sm font-semibold ${
            lastResult === "correct" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {lastResult === "correct" ? "Correct" : "Fail"}
        </div>
      )}
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            disabled={!!lastResult}
            className="w-full text-left p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-card/80 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current text-sm font-semibold flex-shrink-0 mt-0.5">
                {String.fromCharCode(65 + index)}
              </div>
              <span className="font-medium leading-relaxed">{option}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  const renderFixTheCode = () => (
    <div className="space-y-4">
      <p className="text-lg font-semibold text-foreground mb-4">{question.content}</p>
      {lastResult && (
        <div
          className={`px-3 py-2 rounded-md text-sm font-semibold ${
            lastResult === "correct" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {lastResult === "correct" ? "Correct" : "Fail"}
        </div>
      )}
      <div className="space-y-2">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => onAnswer(index)}
            disabled={!!lastResult}
            className="w-full text-left p-4 rounded-lg border-2 border-border bg-card hover:border-primary hover:bg-card/80 transition-all"
          >
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-current text-sm font-semibold flex-shrink-0 mt-0.5">
                {String.fromCharCode(65 + index)}
              </div>
              <div className="flex-1">
                <span className="font-medium block leading-relaxed">{option}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // Guard: if question is undefined, render a placeholder to avoid crashes
  if (!question) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="p-6 bg-card border border-border rounded">
            <div className="text-lg font-semibold">Question not available</div>
            <div className="text-sm text-muted-foreground">This question is missing or still loading. You can skip or end the game.</div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" onClick={onSkip}>Skip</Button>
              <Button onClick={onEnd}>End Game</Button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header with Info */}
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-start gap-4">
            <div className="space-y-1">
              {/* Intentionally hide question index/total for puzzle-rush style play */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                  {question.difficulty}
                </Badge>
                <Badge variant="secondary">{question.language}</Badge>
                <Badge variant="outline">{question.format}</Badge>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <div className="flex items-center gap-2">
                {onBack && (
                  <button aria-label="Back" onClick={onBack} className="p-2 rounded hover:bg-muted">
                    <span className="sr-only">Back</span>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                )}
                {onReload && (
                  <button aria-label="Reload" onClick={onReload} className="p-2 rounded hover:bg-muted">
                    <span className="sr-only">Reload</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 12a9 9 0 1 1-3-6.7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M21 3v6h-6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                )}
              </div>

            {/* Survival mode: show 5 lives (checkboxes) */}
              {mode === "survival" && (
                <div className="flex gap-2">
                  {Array.from({ length: 5 }).map((_, i) => {
                    const hasLife = i < 5 - strikes
                    console.log(`  [LIFE ${i}] i=${i}, 5-strikes=${5-strikes}, hasLife=${hasLife}`)
                    return (
                      <div key={i} className={`text-2xl font-bold ${hasLife ? "text-green-600" : "text-red-600"}`}>
                        {hasLife ? "✓" : "✗"}
                      </div>
                    )
                  })}
                </div>
              )}
              {showTimer && timeLeft !== undefined && (
                <div
                  className={`text-sm font-semibold px-3 py-2 rounded-lg ${
                    timeLeft < 30 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" : "bg-secondary"
                  }`}
                >
                  {formatTimeDisplay(timeLeft)}
                </div>
              )}
            </div>
          </div>

          {/* No progress bar in timed continuous mode */}
        </div>

        {/* Question Card */}
        <Card className="border-2">
          <CardContent className="pt-8 pb-8 space-y-8">
            {/* Question Content */}
            {renderQuestionContent()}

            {/* Navigation */}
            <div className="flex gap-2 pt-4 border-t border-border flex-col sm:flex-row">
              <Button variant="outline" onClick={onSkip} className="flex-1 gap-2 bg-transparent">
                <ChevronLeft className="h-4 w-4" /> Skip Question
              </Button>
              <Button onClick={onEnd} variant="destructive" className="flex-1">
                End Game
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
