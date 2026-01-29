"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, Loader2, Copy, Check, AlertCircle } from "lucide-react"
import { preloadQuestionsCache } from "@/lib/game-queries"
import { createFriendChallenge, checkChallengeThrottle } from "@/lib/friend-challenges"

// Game mode settings
const gameModes = [
  {
    id: "3min",
    title: "3-Minute Rush",
    description: "Solve as many problems as you can in 3 minutes",
    questions: 15,
  },
  {
    id: "5min",
    title: "5-Minute Rush",
    description: "Solve as many problems as you can in 5 minutes",
    questions: 25,
  },
  {
    id: "survival",
    title: "Survival Mode",
    description: "Keep solving until 3 wrong answers",
    questions: 50,
  },
]

const languages = [
  { id: "HTML", title: "HTML", icon: "🌐" },
  { id: "CSS", title: "CSS", icon: "🎨" },
  { id: "JavaScript", title: "JavaScript", icon: "⚡" },
]

export default function FriendChallengeSetupPage() {
  const router = useRouter()
  const { user, userProfile } = useAuth()

  const [gameMode, setGameMode] = useState<"3min" | "5min" | "survival">("3min")
  const [language, setLanguage] = useState<"HTML" | "CSS" | "JavaScript">("JavaScript")
  const [isRated, setIsRated] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challengeLink, setChallengeLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [questionFormat, setQuestionFormat] = useState<"all" | "MCQ" | "Fill in the Blank" | "Fix the Code">("all")

  const checkQuestions = async (selectedLanguage: string) => {
    const formatArg = questionFormat === "all" ? undefined : (questionFormat as any)
    const questions = await preloadQuestionsCache(
      selectedLanguage as "HTML" | "CSS" | "JavaScript",
      formatArg,
      30
    )
    if (!questions || questions.length < 30) {
      throw new Error(`Not enough ${selectedLanguage} questions available. Please try again later.`)
    }
  }

  const handleCreateFriendChallenge = async () => {
    try {
      setError(null)
      setChallengeLink(null)
      setLoading(true)
      await checkQuestions(language)

      if (!user || !userProfile) {
        throw new Error("Not authenticated")
      }

      // Check throttle before creating challenge
      const throttle = await checkChallengeThrottle(user.uid)
      if (!throttle.allowed) {
        const resetDate = throttle.resetTime ? new Date(throttle.resetTime).toLocaleTimeString() : "unknown"
        throw new Error(`Too many challenges sent. Try again at ${resetDate}`)
      }

      // Create real challenge document
      const result = await createFriendChallenge(
        user.uid,
        userProfile.username,
        userProfile.languageRatings[language] || 1200,
        userProfile.profilePicture,
        "", // Empty opponentId for shareable link
        "", // Empty friendUsername for shareable link
        gameMode as "3-min" | "5-min" | "survival",
        language,
        questionFormat,
        isRated,
      )

      if (result.error) {
        throw new Error(result.error)
      }

      // Set shareable link using the real challenge ID
      setChallengeLink(`${window.location.origin}/challenge/${result.challengeId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create challenge")
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (challengeLink) {
      navigator.clipboard.writeText(challengeLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-background to-secondary p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Button
          variant="ghost"
          className="gap-2"
          onClick={() => router.push("/dashboard/play")}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Create Friend Challenge</CardTitle>
            <CardDescription>Challenge your friends to a coding competition</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {challengeLink && (
              <Alert className="bg-green-900/20 border-green-700">
                <Check className="h-4 w-4 text-green-400" />
                <AlertDescription className="text-green-200">
                  Challenge created! Share this link:
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={challengeLink}
                      readOnly
                      className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted font-mono"
                    />
                    <Button size="sm" onClick={handleCopyLink} variant={copied ? "default" : "outline"} className="gap-2">
                      {copied ? (
                        <>
                          <Check className="w-4 h-4" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Game Mode Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Game Mode</Label>
              <RadioGroup value={gameMode} onValueChange={(value) => setGameMode(value as any)}>
                <div className="space-y-3">
                  {gameModes.map((mode) => (
                    <div
                      key={mode.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                        onClick={() => setGameMode(mode.id as any)}
                    >
                      <RadioGroupItem value={mode.id} id={mode.id} />
                      <div className="flex-1">
                        <Label htmlFor={mode.id} className="text-sm font-medium cursor-pointer">
                          {mode.title}
                        </Label>
                        <p className="text-xs text-slate-400">{mode.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Language Selection */}
            <div>
              <Label className="text-base font-semibold mb-3 block">Language</Label>
              <RadioGroup value={language} onValueChange={(value) => setLanguage(value as any)}>
                <div className="grid grid-cols-3 gap-3">
                  {languages.map((lang) => (
                    <div
                      key={lang.id}
                      className="flex items-center gap-2 p-3 rounded-lg border hover:border-primary cursor-pointer transition-colors"
                      onClick={() => setLanguage(lang.id as any)}
                    >
                      <RadioGroupItem value={lang.id} id={lang.id} />
                      <Label htmlFor={lang.id} className="text-sm font-medium cursor-pointer">
                        <span className="mr-2">{lang.icon}</span>
                        {lang.title}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            </div>

            {/* Question Format Selection */}
            <div>
              <Label htmlFor="format-select" className="text-base font-semibold mb-3 block">
                Question Format
              </Label>
              <select
                id="format-select"
                value={questionFormat}
                onChange={(e) => setQuestionFormat(e.target.value as any)}
                className="w-full rounded-md border px-3 py-2"
              >
                <option value="all">All Formats</option>
                <option value="MCQ">Multiple Choice</option>
                <option value="Fill in the Blank">Fill in the Blank</option>
                <option value="Fix the Code">Fix the Code</option>
              </select>
            </div>

            {/* Rated Toggle */}
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm font-medium">Rated Challenge</Label>
                <p className="text-xs text-slate-400 mt-1">Affects rating if enabled</p>
              </div>
              <Switch checked={isRated} onCheckedChange={setIsRated} />
            </div>

            {/* Create Button */}
            <Button onClick={handleCreateFriendChallenge} disabled={loading || !!challengeLink} className="w-full">
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? "Creating Challenge..." : "Create & Share Challenge"}
            </Button>

            {/* Info */}
            <p className="text-xs text-slate-400 text-center">
              Challenge link valid for 2 minutes. Your friend must accept to start.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
