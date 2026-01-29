import { collection, query, where, orderBy, limit, startAfter, getDocs, type QueryConstraint } from "firebase/firestore"
import { db } from "./firebase"

export interface LeaderboardEntry {
  uid: string
  username: string
  profilePicture?: string
  rating: number
  category: string
  matchesPlayed?: number
  lastUpdated: number
}

type TimeRange = "all-time" | "month" | "week" | "today"
type Language = "HTML" | "CSS" | "JavaScript"

const ITEMS_PER_PAGE = 20

/**
 * Get timestamp for time range filters
 */
function getTimeRangeTimestamp(range: TimeRange): number {
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000

  switch (range) {
    case "today":
      return now - oneDay
    case "week":
      return now - 7 * oneDay
    case "month":
      return now - 30 * oneDay
    case "all-time":
      return 0
    default:
      return 0
  }
}

/**
 * Fetch leaderboard entries for a specific language with pagination
 * @param language The programming language (HTML, CSS, or JavaScript)
 * @param timeRange Filter by time range
 * @param pageIndex Pagination index (0 = first page)
 * @param lastVisible Last visible document for pagination
 */
export async function fetchLeaderboard(
  language: Language,
  timeRange: TimeRange = "all-time",
  pageIndex = 0,
  lastVisible?: any,
) {
  try {
    const constraints: QueryConstraint[] = [
      orderBy(`languageRatings.${language}`, "desc"),
      limit(ITEMS_PER_PAGE + 1), // Fetch one extra to know if there's a next page
    ]

    // Add time range filter if not all-time
    if (timeRange !== "all-time") {
      const minTimestamp = getTimeRangeTimestamp(timeRange)
      constraints.push(where("updatedAt", ">=", minTimestamp))
    }

    // Add pagination
    if (lastVisible) {
      constraints.push(startAfter(lastVisible))
    }

    const q = query(collection(db, "users"), ...constraints)
    const snapshot = await getDocs(q)

    const entries: LeaderboardEntry[] = []
    let nextPageCursor = null
    let hasNextPage = false

    snapshot.docs.forEach((doc, idx) => {
      if (idx < ITEMS_PER_PAGE) {
        const data = doc.data()
        entries.push({
          uid: doc.id,
          username: data.username,
          profilePicture: data.profilePicture,
          rating: data.languageRatings[language] || 400,
          category: getRatingCategory(data.languageRatings[language] || 400),
          matchesPlayed: data.matchesPlayed || 0,
          lastUpdated: data.updatedAt,
        })
      } else {
        hasNextPage = true
        nextPageCursor = doc
      }
    })

    return {
      entries,
      hasNextPage,
      nextPageCursor,
    }
  } catch (error) {
    console.error("[v0] Error fetching leaderboard:", error)
    throw error
  }
}

/**
 * Get rating category based on Elo rating
 */
function getRatingCategory(rating: number): string {
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
 * Fetch user's rank in leaderboard for a specific language
 */
export async function getUserRank(userId: string, language: Language): Promise<number | null> {
  try {
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", userId)))

    if (userDoc.empty) return null

    const userRating = userDoc.docs[0].data().languageRatings[language] || 400

    // Count how many users have higher rating
    const higherRatedUsers = await getDocs(
      query(collection(db, "users"), where(`languageRatings.${language}`, ">", userRating), limit(1000)),
    )

    return higherRatedUsers.size + 1 // +1 because rank starts from 1
  } catch (error) {
    console.error("[v0] Error fetching user rank:", error)
    return null
  }
}
