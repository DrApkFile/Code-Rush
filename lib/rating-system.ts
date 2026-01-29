// Lichess-style Elo rating calculation utilities for CodeRush

export interface LanguageRatings {
  HTML: number
  CSS: number
  JavaScript: number
  overall?: number
}

export interface RatingChangeResult {
  oldRating: number
  newRating: number
  ratingChange: number
}

// K-factor constants
const K_FACTOR_HIGH = 40 // For players below 2100 rating (faster growth)
const K_FACTOR_LOW = 20 // For players 2100+ rating (slower growth)
const VOLATILITY_THRESHOLD = 2100

/**
 * Calculate the K-factor based on current rating
 * Higher K-factor for lower ratings = faster rating movement for newer players
 */
function getKFactor(rating: number): number {
  return rating < VOLATILITY_THRESHOLD ? K_FACTOR_HIGH : K_FACTOR_LOW
}

/**
 * Calculate expected score for a player using Elo formula
 * Expected Score = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
 */
function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400))
}

/**
 * Calculate new rating after a match
 * New Rating = Old Rating + K * (Actual Score - Expected Score)
 *
 * @param playerRating Current player rating
 * @param opponentRating Opponent's rating
 * @param playerWon Whether the player won (1) or lost (0)
 * @returns Object with old rating, new rating, and change amount
 */
export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  playerWon: boolean,
): RatingChangeResult {
  const expectedScore = calculateExpectedScore(playerRating, opponentRating)
  const actualScore = playerWon ? 1 : 0
  const kFactor = getKFactor(playerRating)
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore))
  const newRating = Math.max(400, playerRating + ratingChange) // Minimum rating of 400

  return {
    oldRating: playerRating,
    newRating,
    ratingChange,
  }
}

/**
 * Update a player's rating for a specific language after a match
 * @param currentRatings The player's current language ratings
 * @param language The language played (HTML, CSS, or JavaScript)
 * @param playerWon Whether the player won
 * @param opponentRating The opponent's rating for that language
 * @returns Updated language ratings object
 */
export function updateLanguageRating(
  currentRatings: LanguageRatings,
  language: "HTML" | "CSS" | "JavaScript",
  playerWon: boolean,
  opponentRating: number,
): LanguageRatings {
  const playerRating = currentRatings[language]
  const { newRating } = calculateEloChange(playerRating, opponentRating, playerWon)

  const updated = {
    ...currentRatings,
    [language]: newRating,
  }
  
  // Recalculate overall rating as average of all language ratings
  updated.overall = Math.round((updated.HTML + updated.CSS + updated.JavaScript) / 3)
  
  return updated
}

/**
 * Calculate rating change for both players after a match
 * Returns the rating changes for player1 and player2
 */
export function calculateBothPlayersEloChange(
  player1Rating: number,
  player2Rating: number,
  player1Won: boolean,
): { player1Change: RatingChangeResult; player2Change: RatingChangeResult } {
  const player1Change = calculateEloChange(player1Rating, player2Rating, player1Won)
  const player2Change = calculateEloChange(player2Rating, player1Rating, !player1Won)

  return { player1Change, player2Change }
}

/**
 * Get rating category based on Elo rating (Lichess-style)
 */
export function getRatingCategory(rating: number): string {
  if (rating < 1000) return "Beginner"
  if (rating < 1200) return "Novice"
  if (rating < 1400) return "Intermediate"
  if (rating < 1600) return "Advanced"
  if (rating < 1800) return "Expert"
  if (rating < 2000) return "Master"
  if (rating < 2200) return "Grandmaster"
  return "Super GM"
}

/**
 * Initialize default language ratings
 */
export function initializeDefaultRatings(): LanguageRatings {
  return {
    HTML: 400,
    CSS: 400,
    JavaScript: 400,
    overall: 400,
  }
}
