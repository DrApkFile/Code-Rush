import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  where,
  limit,
  getDoc,
  getDocs,
  orderBy,
} from "firebase/firestore"
import { db } from "./firebase"
import { fetchRandomQuestions as fetchQuestionsFromGame } from "./game-queries"
import { calculateBothPlayersEloChange, updateLanguageRating } from "./rating-system"

export { fetchRandomQuestions } from "./game-queries"

export interface LanguageRatings {
  HTML: number
  CSS: number
  JavaScript: number
}

export interface MatchPlayer {
  uid: string
  username: string
  profilePicture?: string
  languageRatings: LanguageRatings
  score: number
  correctAnswers: number
  wrongAnswers: number
  answers: (number | null)[]
  ready: boolean
}

export interface Match {
  id: string
  player1: MatchPlayer
  player2?: MatchPlayer
  language: "HTML" | "CSS" | "JavaScript"
  mode: "random" | "friend" | "ranked"
  isRated: boolean
  questions: any[]
  status: "waiting" | "in_progress" | "completed"
  createdAt: number
  startedAt?: number
  endedAt?: number
  winner?: string
  results?: {
    player1: { score: number; accuracy: number; correctAnswers: number }
    player2?: { score: number; accuracy: number; correctAnswers: number }
  }
}

// Add player to waiting pool
export async function joinWaitingPool(
  userId: string,
  username: string,
  languageRatings: LanguageRatings,
  language: "HTML" | "CSS" | "JavaScript",
): Promise<string> {
  try {
    const waitingRef = collection(db, "waiting_pool")
    const playerRef = await addDoc(waitingRef, {
      userId,
      username,
      languageRatings,
      language,
      profilePicture: "",
      joinedAt: Date.now(),
    })
    return playerRef.id
  } catch (error) {
    console.error("[v0] Error joining waiting pool:", error)
    throw error
  }
}

// Remove player from waiting pool
export async function leaveWaitingPool(waitingPoolId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "waiting_pool", waitingPoolId), {
      status: "left",
    })
  } catch (error) {
    console.error("[v0] Error leaving waiting pool:", error)
    throw error
  }
}

// Check for available opponent in waiting pool
export async function findOpponent(
  currentUserId: string,
  language: "HTML" | "CSS" | "JavaScript",
): Promise<any | null> {
  try {
    const q = query(
      collection(db, "waiting_pool"),
      where("language", "==", language),
      where("status", "==", undefined),
      limit(1),
    )

    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      return {
        id: querySnapshot.docs[0].id,
        ...querySnapshot.docs[0].data(),
      }
    }
    return null
  } catch (error) {
    console.error("[v0] Error finding opponent:", error)
    return null
  }
}

// Create match with two players
export async function createMatch(
  player1Data: any,
  player2Data: any,
  language: "HTML" | "CSS" | "JavaScript",
  mode: "random" | "friend" | "ranked",
): Promise<string> {
  try {
    const questions = await fetchQuestionsFromGame(language)
    const matchRef = collection(db, "matches")
    const match: Match = {
      id: "",
      player1: {
        uid: player1Data.userId,
        username: player1Data.username,
        profilePicture: player1Data.profilePicture || "",
        languageRatings: player1Data.languageRatings,
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        answers: new Array(questions.length).fill(null),
        ready: false,
      },
      player2: {
        uid: player2Data.userId,
        username: player2Data.username,
        profilePicture: player2Data.profilePicture || "",
        languageRatings: player2Data.languageRatings,
        score: 0,
        correctAnswers: 0,
        wrongAnswers: 0,
        answers: new Array(questions.length).fill(null),
        ready: false,
      },
      language,
      mode,
      isRated: mode === "ranked",
      questions,
      status: "waiting",
      createdAt: Date.now(),
    }

    const docRef = await addDoc(matchRef, match)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating match:", error)
    throw error
  }
}

// Listen to match updates in real-time
export function listenToMatch(matchId: string, callback: (match: Match) => void): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, "matches", matchId), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data() as Match)
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to match:", error)
    return () => {}
  }
}

// Update player answer during match
export async function updateMatchPlayerAnswer(
  matchId: string,
  playerNumber: 1 | 2,
  questionIndex: number,
  answerIndex: number | null,
  isCorrect: boolean,
): Promise<void> {
  try {
    const matchRef = doc(db, "matches", matchId)
    const matchSnap = await getDoc(matchRef)

    if (!matchSnap.exists()) return

    const match = matchSnap.data() as Match
    const playerKey = playerNumber === 1 ? "player1" : "player2"
    const player = match[playerKey]

    if (!player) return

  // Update answer (answers array supports null for skipped)
  const newAnswers = [...player.answers]
  newAnswers[questionIndex] = answerIndex as any

  // For skipped questions (answerIndex === null), count as wrong
  const isSkipped = answerIndex === null
  const newCorrectAnswers = isCorrect && !isSkipped ? player.correctAnswers + 1 : player.correctAnswers
  const newWrongAnswers = (!isCorrect || isSkipped) ? player.wrongAnswers + 1 : player.wrongAnswers
  const newScore = newCorrectAnswers * 10

    await updateDoc(matchRef, {
      [playerKey]: {
        ...player,
        answers: newAnswers,
        score: newScore,
        correctAnswers: newCorrectAnswers,
        wrongAnswers: newWrongAnswers,
      },
    })
  } catch (error) {
    console.error("[v0] Error updating match answer:", error)
    throw error
  }
}

// Complete match and update ratings
export async function completeMatch(
  matchId: string,
  player1Score: number,
  player2Score: number,
  language: "HTML" | "CSS" | "JavaScript",
): Promise<void> {
  try {
    const matchRef = doc(db, "matches", matchId)
    const matchSnap = await getDoc(matchRef)

    if (!matchSnap.exists()) return

    const match = matchSnap.data() as Match

    // Determine winner
    const winner = player1Score > player2Score ? match.player1.uid : match.player2?.uid

    const endedAt = Date.now()

    // Calculate accuracy based on answered questions only (not total questions)
    const player1TotalAnswered = match.player1.correctAnswers + match.player1.wrongAnswers
    const player1Accuracy = player1TotalAnswered > 0 
      ? (match.player1.correctAnswers / player1TotalAnswered) * 100 
      : 0

    // Update match document
    await updateDoc(matchRef, {
      status: "completed",
      endedAt,
      winner,
      results: {
        player1: {
          score: player1Score,
          accuracy: player1Accuracy,
          correctAnswers: match.player1.correctAnswers,
        },
        player2: match.player2
          ? {
              score: player2Score,
              accuracy: match.player2.correctAnswers > 0 
                ? (match.player2.correctAnswers / (match.player2.correctAnswers + match.player2.wrongAnswers)) * 100
                : 0,
              correctAnswers: match.player2.correctAnswers,
            }
          : undefined,
      },
    })

    // Update ratings if rated match
    if (match.isRated && match.player2) {
      await updatePlayerRatings(match.player1.uid, match.player2.uid, language, player1Score > player2Score)
    }
  } catch (error) {
    console.error("[v0] Error completing match:", error)
    throw error
  }
}

// Update Elo ratings for both players
async function updatePlayerRatings(
  player1Id: string,
  player2Id: string,
  language: "HTML" | "CSS" | "JavaScript",
  player1Won: boolean,
): Promise<void> {
  try {
    // Get current user data
    const player1Snap = await getDoc(doc(db, "users", player1Id))
    const player2Snap = await getDoc(doc(db, "users", player2Id))

    if (!player1Snap.exists() || !player2Snap.exists()) return

    const player1Data = player1Snap.data()
    const player2Data = player2Snap.data()

    const player1Ratings = player1Data.languageRatings
    const player2Ratings = player2Data.languageRatings

    // Calculate new ratings using Elo formula
    const { player1Change, player2Change } = calculateBothPlayersEloChange(
      player1Ratings[language],
      player2Ratings[language],
      player1Won,
    )

    // Update both players' language-specific ratings
    const updatedPlayer1Ratings = updateLanguageRating(player1Ratings, language, player1Won, player2Ratings[language])
    const updatedPlayer2Ratings = updateLanguageRating(player2Ratings, language, !player1Won, player1Ratings[language])

    // Update Firestore
    await updateDoc(doc(db, "users", player1Id), {
      languageRatings: updatedPlayer1Ratings,
      updatedAt: Date.now(),
    })

    await updateDoc(doc(db, "users", player2Id), {
      languageRatings: updatedPlayer2Ratings,
      updatedAt: Date.now(),
    })

    console.log("[v0] Rating updated:", {
      player1: { old: player1Change.oldRating, new: player1Change.newRating, change: player1Change.ratingChange },
      player2: { old: player2Change.oldRating, new: player2Change.newRating, change: player2Change.ratingChange },
    })
  } catch (error) {
    console.error("[v0] Error updating ratings:", error)
    throw error
  }
}

// Get match by ID
export async function getMatch(matchId: string): Promise<Match | null> {
  try {
    const matchSnap = await getDoc(doc(db, "matches", matchId))
    if (matchSnap.exists()) {
      return matchSnap.data() as Match
    }
    return null
  } catch (error) {
    console.error("[v0] Error getting match:", error)
    return null
  }
}

// Get solo match by ID
export async function getSoloMatch(matchId: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, "solo_matches", matchId))
    if (snap.exists()) return { id: snap.id, ...snap.data() }
    return null
  } catch (error) {
    console.error("[v0] Error getting solo match:", error)
    return null
  }
}

// Get user's solo matches (mapped to a lightweight session-like shape)
export async function getUserSoloMatches(userId: string, gamesLimit = 20): Promise<any[]> {
  try {
    const q = query(
      collection(db, "solo_matches"),
      where("player1.uid", "==", userId),
      orderBy("createdAt", "desc"),
      limit(gamesLimit),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((docSnap) => {
      const d: any = docSnap.data()
      return {
        id: docSnap.id,
        userId: d.player1?.uid,
        language: d.language,
        startTime: d.startedAt ?? d.createdAt,
        endTime: d.endedAt ?? d.createdAt,
        score: d.results?.player1?.score ?? (d.player1?.score ?? 0),
        correctAnswers: d.player1?.correctAnswers ?? d.results?.player1?.correctAnswers ?? 0,
        questionsAnswered: d.questions?.length ?? (d.results?.player1?.correctAnswers ?? 0) + (d.player1?.wrongAnswers ?? 0),
        accuracy: d.results?.player1?.accuracy ?? 0,
        ratingChange: d.ratingChange ?? 0,
        questions: d.questions ?? [],
        // keep original raw doc for review pages that fetch full object
        _raw: d,
      }
    })
  } catch (error) {
    console.error("[v0] Error fetching user solo matches:", error)
    return []
  }
}

// Create a solo match for records/history
export async function createSoloMatch(
  userId: string,
  username: string,
  language: "HTML" | "CSS" | "JavaScript",
  questionsFull: any[],
  answers: (number | null)[],
  sessionQuestions: Array<{ questionId: string; correct: boolean; timeSpent: number }> ,
  correctAnswers: number,
  totalQuestions: number,
  ratingBefore: number,
  ratingAfter: number,
  ratingChange: number,
  userLanguageRatings: any,
  mode: "3min" | "5min" | "survival" = "3min",
): Promise<string> {
  try {
    // Store solo games in a dedicated collection so multiplayer flow is kept separate
    const matchRef = collection(db, "solo_matches")
    const now = Date.now()

    // Compose full questions with user's answer and timeSpent where possible
    const questions = (questionsFull || []).map((q: any, idx: number) => {
      const sq = sessionQuestions && sessionQuestions[idx]
      return {
        id: q.id,
        content: q.content,
        options: q.options,
        explanation: q.explanation ?? null,
        difficulty: q.difficulty ?? null,
        correctAnswerIndex: q.correctAnswerIndex,
        userAnswerIndex: answers?.[idx] ?? null,
        timeSpent: sq?.timeSpent ?? 0,
        correct: sq?.correct ?? (answers?.[idx] === q.correctAnswerIndex),
      }
    })

    const match: any = {
      player1: {
        uid: userId,
        username: username,
        profilePicture: "",
        languageRatings: userLanguageRatings || {}, // snapshot of user's ratings at time of match
        score: correctAnswers * 10,
        correctAnswers: correctAnswers,
        wrongAnswers: totalQuestions - correctAnswers,
        answers: answers || [],
        ready: true,
      },
      language,
      mode: "solo",
      isRated: true,
      questions,
      sessionQuestions: sessionQuestions || [],
      status: "completed",
      createdAt: now,
      startedAt: now,
      endedAt: now,
      winner: userId,
      results: {
        player1: {
          score: correctAnswers * 10,
          accuracy: (correctAnswers / Math.max(totalQuestions, 1)) * 100,
          correctAnswers: correctAnswers,
        },
      },
      ratingBefore: ratingBefore,
      ratingAfter: ratingAfter,
      ratingChange: ratingChange,
      gameMode: mode, // Store original game mode (3min, 5min, survival)
    }

    const docRef = await addDoc(matchRef, match)
    console.log("[v0] Created solo match:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating solo match:", error)
    throw error
  }
}
