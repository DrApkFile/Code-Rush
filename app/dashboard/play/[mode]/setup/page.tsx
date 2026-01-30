"use client"

import { useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Switch } from "@/components/ui/switch"
import { ChevronLeft, Loader2 } from "lucide-react"
import { preloadQuestionsCache } from "@/lib/game-queries"
import { createMatch } from "@/lib/multiplayer-queries"
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
    description: "Keep solving until 5 wrong answers",
    questions: 50,
  },
]

const languages = [
  { id: "HTML", title: "HTML", icon: "🌐" },
  { id: "CSS", title: "CSS", icon: "🎨" },
  { id: "JavaScript", title: "JavaScript", icon: "⚡" },
  { id: "random", title: "Random", icon: "🎲", description: "Mix of all languages" },
]

export default function GameSetupPage() {
  const router = useRouter()
  const params = useParams()
  const { user, userProfile } = useAuth()
  const playMode = params.mode as "solo" | "friend" | "random"

  const [gameMode, setGameMode] = useState<"3min" | "5min" | "survival">("3min")
  const [language, setLanguage] = useState<"HTML" | "CSS" | "JavaScript" | "random">("JavaScript")
  const [isRated, setIsRated] = useState(playMode === "solo") // Solo is always rated
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [challengeLink, setChallengeLink] = useState<string | null>(null)
  const [questionFormat, setQuestionFormat] = useState<"all" | "MCQ" | "Fill in the Blank" | "Fix the Code">("all")

  const checkQuestions = async (selectedLanguage: string) => {
    // For "random", check if we have enough questions in any language
    const languages = selectedLanguage === "random"
      ? ["HTML", "CSS", "JavaScript"]
      : [selectedLanguage]

    for (const lang of languages) {
      const formatArg = questionFormat === "all" ? undefined : (questionFormat as any)
      const questions = await preloadQuestionsCache(
        lang as "HTML" | "CSS" | "JavaScript",
        formatArg,
        30
      )
      if (!questions || questions.length < 30) {
        if (selectedLanguage !== "random") {
          throw new Error(`Not enough ${lang} questions available. Please try again later.`)
        }
      } else if (selectedLanguage === "random") {
        return questions // Found enough questions in at least one language
      }
    }

    if (selectedLanguage === "random") {
      throw new Error("Not enough questions available in any language. Please try again later.")
    }
  }

  const handleStartSoloGame = async () => {
    try {
      await checkQuestions(language)
      router.push(`/dashboard/play/solo/game?mode=${gameMode}&language=${language}&format=${encodeURIComponent(questionFormat)}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game")
    }
  }

  const handleCreateFriendChallenge = async () => {
    try {
      setError(null)
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
        userProfile.languageRatings[language === "random" ? "JavaScript" : (language as "HTML" | "CSS" | "JavaScript")] || 1200,
        userProfile.languageRatings,
        userProfile.profilePicture,
        "", // Empty opponentId for shareable link
        "", // Empty friendUsername for shareable link
        gameMode as "3-min" | "5-min" | "survival",
        language as "HTML" | "CSS" | "JavaScript",
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
    }
  }

  const handleStartRandomMatch = async () => {
    try {
      if (!user || !userProfile) {
        throw new Error("Not authenticated")
      }

      await checkQuestions(language)
      await createMatch(
        {
          userId: user.uid,
          username: userProfile.username,
          profilePicture: userProfile.profilePicture,
          languageRatings: userProfile.languageRatings,
        },
        {
          userId: "",
          username: "",
          profilePicture: "",
          languageRatings: userProfile.languageRatings,
        },
        language as "HTML" | "CSS" | "JavaScript",
        "random"
      )
      router.push(`/dashboard/play/random/matchmaking?mode=${gameMode}&language=${language}&rated=${isRated}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start matchmaking")
    }
  }

  const handleStart = async () => {
    setError(null)
    setLoading(true)

    try {
      switch (playMode) {
        case "solo":
          await handleStartSoloGame()
          break
        case "friend":
          await handleCreateFriendChallenge()
          break
        case "random":
          await handleStartRandomMatch()
          break
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start game")
    } finally {
      setLoading(false)
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
            <CardTitle>
              {playMode === "solo" && "Solo Play"}
              {playMode === "friend" && "Friend Challenge"}
              {playMode === "random" && "Random Match"}
            </CardTitle>
            <CardDescription>
              {playMode === "solo" && "Practice and improve your skills"}
              {playMode === "friend" && "Create a challenge link to share"}
              {playMode === "random" && "Get matched with similar rated players"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!userProfile ? (
              <div className="text-center space-y-4 py-4">
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4 rounded-lg">
                  <p className="text-amber-800 dark:text-amber-200 font-medium">Authentication Required</p>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You need to be logged in to {playMode === 'friend' ? 'create challenges' : 'play'}.
                  </p>
                </div>
                <Button onClick={() => router.push("/login")} className="w-full">
                  Login
                </Button>
                <Button onClick={() => router.push("/signup")} variant="outline" className="w-full">
                  Create Account
                </Button>
              </div>
            ) : (
              <>
                {/* Game Mode Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium">Game Mode</h3>
                  <RadioGroup
                    value={gameMode}
                    onValueChange={(value) => setGameMode(value as "3min" | "5min" | "survival")}
                  >
                    <div className="grid grid-cols-1 gap-4">
                      {gameModes.map((mode) => (
                        <Label
                          key={mode.id}
                          className="flex items-start space-x-3 space-y-0 rounded-md border p-3 cursor-pointer hover:border-primary"
                        >
                          <RadioGroupItem value={mode.id} />
                          <div className="space-y-1">
                            <p className="font-medium">{mode.title}</p>
                            <p className="text-sm text-muted-foreground">{mode.description}</p>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Language Selection */}
                <div className="space-y-4">
                  <h3 className="font-medium">Language</h3>
                  <RadioGroup
                    value={language}
                    onValueChange={(value) => setLanguage(value as "HTML" | "CSS" | "JavaScript" | "random")}
                  >
                    <div className="grid grid-cols-2 gap-4">
                      {languages.map((lang) => (
                        <Label
                          key={lang.id}
                          className="flex items-center space-x-3 space-y-0 rounded-md border p-3 cursor-pointer hover:border-primary"
                        >
                          <RadioGroupItem value={lang.id} />
                          <div className="flex items-center gap-2">
                            <span>{lang.icon}</span>
                            <p className="font-medium">{lang.title}</p>
                          </div>
                        </Label>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {/* Rated Switch - Not for solo */}
                {playMode !== "solo" && (
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <Label className="text-base">Rated Game</Label>
                      <p className="text-sm text-muted-foreground">Affects your rating if enabled</p>
                    </div>
                    <Switch
                      checked={isRated}
                      onCheckedChange={setIsRated}
                    />
                  </div>
                )}

                {/* Question Format */}
                <div className="space-y-2">
                  <h3 className="font-medium">Question Format</h3>
                  <select
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

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Challenge Link */}
                {challengeLink && (
                  <div className="rounded-md border p-3 space-y-2">
                    <p className="text-sm font-medium">Share this link with your friend:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        readOnly
                        value={challengeLink}
                        className="flex-1 px-3 py-2 text-sm border rounded-md bg-muted"
                      />
                      <Button
                        onClick={() => navigator.clipboard.writeText(challengeLink)}
                        variant="outline"
                      >
                        Copy
                      </Button>
                    </div>
                  </div>
                )}

                {/* Start Button */}
                {!challengeLink && (
                  <Button
                    className="w-full"
                    onClick={handleStart}
                    disabled={loading}
                  >
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {playMode === "solo" && "Start Game"}
                    {playMode === "friend" && "Create Challenge"}
                    {playMode === "random" && "Find Match"}
                  </Button>
                )}

              </>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
