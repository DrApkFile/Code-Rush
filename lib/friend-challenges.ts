import { collection, doc, addDoc, getDoc, updateDoc, onSnapshot, query, where, getDocs, deleteDoc, orderBy, limit } from "firebase/firestore"
import { db } from "./firebase"
import { fetchRandomQuestions } from "./game-queries"
import { createNotification } from "./friends-queries"
import { LanguageRatings } from "./multiplayer-queries"

export interface Challenge {
  id: string
  creatorId: string
  creatorUsername: string
  creatorElo: number
  creatorLanguageRatings?: LanguageRatings
  creatorProfilePic?: string
  opponentId?: string
  opponentUsername?: string
  opponentElo?: number
  opponentLanguageRatings?: LanguageRatings
  opponentProfilePic?: string
  mode: "3-min" | "5-min" | "survival"
  language: "HTML" | "CSS" | "JavaScript"
  questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all"
  isRated: boolean
  status: "pending" | "accepted" | "in_progress" | "completed" | "expired" | "declined"
  matchId?: string
  notificationId?: string
  createdAt: number
  expiresAt: number
  acceptedAt?: number
  completedAt?: number
  declinedAt?: number
}

// Create a new challenge and return shareable link
export async function createChallenge(
  creatorId: string,
  creatorUsername: string,
  creatorElo: number,
  creatorLanguageRatings: LanguageRatings | undefined,
  creatorProfilePic: string | undefined,
  opponentId: string | undefined,
  mode: "3-min" | "5-min" | "survival",
  language: "HTML" | "CSS" | "JavaScript",
  questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all",
  isRated: boolean,
): Promise<{ challengeId: string; link: string }> {
  try {
    const challengeRef = collection(db, "challenges")
    const challenge: Omit<Challenge, "id"> = {
      creatorId,
      creatorUsername,
      creatorElo,
      creatorLanguageRatings,
      creatorProfilePic,
      opponentId,
      mode,
      language,
      questionFormat,
      isRated,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    }

    const docRef = await addDoc(challengeRef, challenge)
    const link = `/challenge/${docRef.id}`

    return { challengeId: docRef.id, link }
  } catch (error) {
    console.error("[v0] Error creating challenge:", error)
    throw error
  }
}

// Accept a challenge
export async function acceptChallenge(
  challengeId: string,
  opponentId: string,
  opponentUsername: string,
  opponentElo: number,
  opponentLanguageRatings: LanguageRatings | undefined,
  opponentProfilePic: string | undefined,
): Promise<string> {
  try {
    const challengeRef = doc(db, "challenges", challengeId)
    const challengeSnap = await getDoc(challengeRef)

    if (!challengeSnap.exists()) {
      throw new Error("Challenge not found")
    }

    const challenge = challengeSnap.data() as Challenge

    // Update challenge status
    await updateDoc(challengeRef, {
      opponentId,
      opponentUsername,
      opponentElo,
      opponentLanguageRatings,
      opponentProfilePic,
      status: "accepted",
      acceptedAt: Date.now(),
    })

    // Create match document
    const formatArg = challenge.questionFormat === "all" ? undefined : challenge.questionFormat
    const questions = await fetchRandomQuestions(challenge.language, formatArg, 10)
    const matchRef = collection(db, "matches")
    const match = {
      challengeId,
      player1: {
        uid: challenge.creatorId,
        username: challenge.creatorUsername,
        profilePicture: challenge.creatorProfilePic || "",
        languageRatings: challenge.creatorLanguageRatings || { HTML: challenge.creatorElo, CSS: challenge.creatorElo, JavaScript: challenge.creatorElo },
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        answers: new Array(questions.length).fill(null),
        ready: false,
      },
      player2: {
        uid: opponentId,
        username: opponentUsername,
        profilePicture: opponentProfilePic || "",
        languageRatings: opponentLanguageRatings || { HTML: opponentElo, CSS: opponentElo, JavaScript: opponentElo },
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        answers: new Array(questions.length).fill(null),
        ready: false,
      },
      language: challenge.language,
      mode: "friend",
      challengeMode: challenge.mode, // Store the specific mode (3min, 5min, survival)
      isRated: challenge.isRated,
      questions,
      status: "in_progress",
      createdAt: Date.now(),
      startedAt: Date.now(),
    }

    const matchDocRef = await addDoc(matchRef, match)
    const matchId = matchDocRef.id

    // Update challenge with match ID
    await updateDoc(challengeRef, {
      matchId,
      status: "in_progress",
    })

    // Notify the challenger that their challenge was accepted
    try {
      await createNotification(challenge.creatorId, "challenge_accepted", opponentId, opponentUsername, { matchId, challengeId })
    } catch (e) {
      console.error('[v0] Error notifying challenger of acceptance:', e)
    }

    return matchId
  } catch (error) {
    console.error("[v0] Error accepting challenge:", error)
    throw error
  }
}

// Get challenge by ID
export async function getChallenge(challengeId: string): Promise<Challenge | null> {
  try {
    const challengeSnap = await getDoc(doc(db, "challenges", challengeId))
    if (challengeSnap.exists()) {
      return { id: challengeSnap.id, ...challengeSnap.data() } as Challenge
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting challenge:", error)
    return null
  }
}

// Get challenge by matchId
export async function getChallengeByMatchId(matchId: string): Promise<Challenge | null> {
  try {
    const q = query(collection(db, "challenges"), where("matchId", "==", matchId), limit(1))
    const snaps = await getDocs(q)
    if (snaps.empty) return null
    const d = snaps.docs[0]
    return { id: d.id, ...d.data() } as Challenge
  } catch (error) {
    console.error("[v0] Error getting challenge by matchId:", error)
    return null
  }
}

// Listen to challenge updates in real-time
export function listenToChallenge(challengeId: string, callback: (challenge: Challenge | null) => void): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, "challenges", challengeId), (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() } as Challenge)
      } else {
        callback(null)
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to challenge:", error)
    return () => { }
  }
}

// Request rematch
export async function requestRematch(
  originalChallengeId: string,
  creatorId: string,
): Promise<{ challengeId: string; link: string }> {
  try {
    const originalChallenge = await getChallenge(originalChallengeId)
    if (!originalChallenge) {
      throw new Error("Original challenge not found")
    }

    // Determine opponent
    const opponentId =
      originalChallenge.creatorId === creatorId ? originalChallenge.opponentId : originalChallenge.creatorId
    const opponentUsername =
      originalChallenge.creatorId === creatorId ? originalChallenge.opponentUsername : originalChallenge.creatorUsername
    const opponentElo =
      originalChallenge.creatorId === creatorId ? originalChallenge.opponentElo : originalChallenge.creatorElo
    const opponentProfilePic =
      originalChallenge.creatorId === creatorId
        ? originalChallenge.opponentProfilePic
        : originalChallenge.creatorProfilePic

    if (!opponentId || !opponentUsername) {
      throw new Error("Opponent information not found")
    }

    // Create new challenge with same settings
    const userSnap = await getDoc(doc(db, "users", creatorId))
    if (!userSnap.exists()) {
      throw new Error("User not found")
    }

    const user = userSnap.data()

    return createChallenge(
      creatorId,
      user.username,
      user.eloRating,
      user.languageRatings,
      user.profilePicture,
      opponentId,
      originalChallenge.mode,
      originalChallenge.language,
      originalChallenge.questionFormat,
      originalChallenge.isRated,
    )
  } catch (error) {
    console.error("[v0] Error requesting rematch:", error)
    throw error
  }
}

// Check if user has sent too many challenges (throttle: 5 in 2 hours)
export async function checkChallengeThrottle(userId: string): Promise<{ allowed: boolean; remainingAttempts: number; resetTime?: number }> {
  try {
    const oneHourAgo = Date.now() - 1 * 60 * 60 * 1000
    const q = query(
      collection(db, "challenges"),
      where("creatorId", "==", userId),
      where("createdAt", ">", oneHourAgo),
      orderBy("createdAt", "asc")
    )
    const querySnapshot = await getDocs(q)
    const recentChallenges = querySnapshot.docs.length

    const limit = 20
    const allowed = recentChallenges < limit
    const remainingAttempts = Math.max(0, limit - recentChallenges)
    const resetTime = recentChallenges > 0 ? querySnapshot.docs[0].data().createdAt + 1 * 60 * 60 * 1000 : undefined

    console.log(`[v0] Challenge throttle check for ${userId}: ${recentChallenges} sent in 1hr, allowed: ${allowed}`)
    return { allowed, remainingAttempts, resetTime }
  } catch (error) {
    console.error("[v0] Error checking challenge throttle (likely missing index):", error)
    // Fail open during development/index-building so users aren't blocked
    return { allowed: true, remainingAttempts: 10 }
  }
}

// Create friend challenge (with throttle check + notification)
export async function createFriendChallenge(
  creatorId: string,
  creatorUsername: string,
  creatorElo: number,
  creatorLanguageRatings: LanguageRatings | undefined,
  creatorProfilePic: string | undefined,
  friendId: string,
  friendUsername: string,
  mode: "3-min" | "5-min" | "survival",
  language: "HTML" | "CSS" | "JavaScript",
  questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all",
  isRated: boolean,
): Promise<{ challengeId: string; error?: string }> {
  try {
    // Check throttle
    const throttle = await checkChallengeThrottle(creatorId)
    if (!throttle.allowed) {
      const resetDate = throttle.resetTime ? new Date(throttle.resetTime).toLocaleTimeString() : "unknown"
      return { challengeId: "", error: `Too many challenges. Try again at ${resetDate}` }
    }

    // Create challenge document
    const challengeRef = collection(db, "challenges")
    const challengeDoc: Omit<Challenge, "id"> = {
      creatorId,
      creatorUsername,
      creatorElo,
      creatorLanguageRatings,
      creatorProfilePic,
      opponentId: friendId,
      opponentUsername: friendUsername,
      mode,
      language,
      questionFormat,
      isRated,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + 2 * 60 * 1000, // 2 minute expiry
    }

    const docRef = await addDoc(challengeRef, challengeDoc)
    const challengeId = docRef.id

    // Create notification for friend
    try {
      const notifId = await createNotification(
        friendId,
        "challenge_received",
        creatorId,
        creatorUsername,
        { mode, language, challengeId },
      )
      await updateDoc(docRef, { notificationId: notifId })
    } catch (notifErr) {
      console.error("[v0] Error creating challenge notification:", notifErr)
    }

    console.log(`[v0] Friend challenge created: ${challengeId}`)
    return { challengeId }
  } catch (error) {
    console.error("[v0] Error creating friend challenge:", error)
    return { challengeId: "", error: "Failed to create challenge" }
  }
}

// Decline a challenge
export async function declineChallenge(challengeId: string, userId: string): Promise<void> {
  try {
    const challengeRef = doc(db, "challenges", challengeId)
    const challengeSnap = await getDoc(challengeRef)

    if (!challengeSnap.exists()) {
      throw new Error("Challenge not found")
    }

    const challenge = challengeSnap.data() as Challenge

    // Only the opponent can decline
    if (challenge.opponentId !== userId) {
      throw new Error("Only the challenged player can decline")
    }

    // Update challenge status
    await updateDoc(challengeRef, {
      status: "declined",
      declinedAt: Date.now(),
    })

    // Notify challenger
    await createNotification(
      challenge.creatorId,
      "challenge_declined",
      userId,
      challenge.opponentUsername || "Unknown",
      { challengeId },
    )

    console.log(`[v0] Challenge declined: ${challengeId}`)
  } catch (error) {
    console.error("[v0] Error declining challenge:", error)
    throw error
  }
}

// Listen to challenge status changes
export function listenToChallengeStatus(
  challengeId: string,
  callback: (status: string, challenge?: Challenge) => void,
): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, "challenges", challengeId), (snapshot) => {
      if (snapshot.exists()) {
        const challenge = { id: snapshot.id, ...snapshot.data() } as Challenge
        callback(challenge.status, challenge)
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to challenge status:", error)
    return () => { }
  }
}

// Mark challenge as expired
export async function expireChallenge(challengeId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "challenges", challengeId), {
      status: "expired",
    })
    console.log(`[v0] Challenge expired: ${challengeId}`)
  } catch (error) {
    console.error("[v0] Error expiring challenge:", error)
  }
}

// Preload questions for a challenge (50% during countdown, rest async)
export async function preloadQuestions(
  language: "HTML" | "CSS" | "JavaScript",
  format: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all" | undefined,
  totalCount: number = 20,
  preloadPercent: number = 0.5,
): Promise<any[]> {
  try {
    const preloadCount = Math.ceil(totalCount * preloadPercent)
    // Convert "all" to undefined for fetchRandomQuestions
    const fetchFormat = format === "all" ? undefined : format
    console.log(`[v0] Preloading ${preloadCount} of ${totalCount} questions for ${language}`)

    // Fetch preload batch
    const preloadedQuestions = await fetchRandomQuestions(language, fetchFormat, preloadCount)

    // Start async fetch for remaining (don't await)
    const remainingCount = totalCount - preloadCount
    if (remainingCount > 0) {
      fetchRandomQuestions(language, fetchFormat, remainingCount).catch((e) =>
        console.error("[v0] Error async-loading remaining questions:", e),
      )
    }

    return preloadedQuestions
  } catch (error) {
    console.error("[v0] Error preloading questions:", error)
    return []
  }
}
