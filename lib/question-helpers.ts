import { Question } from "@/lib/game-queries"

/**
 * Get the color/styling for difficulty level
 */
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case "Easy":
      return "text-green-600 dark:text-green-400"
    case "Medium":
      return "text-yellow-600 dark:text-yellow-400"
    case "Hard":
      return "text-red-600 dark:text-red-400"
    default:
      return "text-gray-600"
  }
}

/**
 * Get the badge class for difficulty
 */
export function getDifficultyBadgeClass(difficulty: string): string {
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

/**
 * Check if answer is correct
 */
export function isAnswerCorrect(question: Question, selectedIndex: number): boolean {
  return selectedIndex === question.correctAnswerIndex
}

/**
 * Format question content for display
 */
export function formatQuestionContent(content: string, format: string): string {
  if (format === "Fill in the Blank") {
    return content // Keep ___ as is for visual rendering
  }
  return content
}

/**
 * Get explanation text
 */
export function getExplanation(question: Question): string {
  return question.explanation || "No explanation available."
}

/**
 * Get language display name
 */
export function getLanguageDisplayName(language: string): string {
  switch (language) {
    case "HTML":
      return "HTML"
    case "CSS":
      return "CSS"
    case "JavaScript":
      return "JavaScript"
    default:
      return language
  }
}

/**
 * Get format display name
 */
export function getFormatDisplayName(format: string): string {
  switch (format) {
    case "MCQ":
      return "Multiple Choice"
    case "Fill in the Blank":
      return "Fill in the Blank"
    case "Fix the Code":
      return "Fix the Code"
    default:
      return format
  }
}

/**
 * Calculate score based on correct answers
 */
export function calculateScore(correctCount: number, totalCount: number): number {
  return Math.round((correctCount / totalCount) * 100)
}

/**
 * Get accuracy percentage string
 */
export function getAccuracyString(correct: number, total: number): string {
  if (total === 0) return "0%"
  return `${Math.round((correct / total) * 100)}%`
}

/**
 * Format time for display (seconds to MM:SS)
 */
export function formatTimeDisplay(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, "0")}`
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

/**
 * Get question by id from list
 */
export function getQuestionById(questions: Question[], id: string): Question | undefined {
  return questions.find((q) => q.id === id)
}

/**
 * Filter questions by difficulty
 */
export function filterByDifficulty(
  questions: Question[],
  difficulty: "Easy" | "Medium" | "Hard" | "all"
): Question[] {
  if (difficulty === "all") return questions
  return questions.filter((q) => q.difficulty === difficulty)
}

/**
 * Filter questions by format
 */
export function filterByFormat(
  questions: Question[],
  format: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all"
): Question[] {
  if (format === "all") return questions
  return questions.filter((q) => q.format === format)
}
