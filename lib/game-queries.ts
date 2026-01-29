import { 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  and, 
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  arrayUnion
} from "firebase/firestore"
import { db } from "./firebase"

export interface GameSession {
  id: string
  userId: string
  mode: "3min" | "5min" | "survival"
  language: string
  format?: string
  startTime: Date
  endTime?: Date
  score: number
  questionsAnswered: number
  correctAnswers: number
  wrongAnswers?: number
  accuracy?: number
  strikes: number
  status: "in_progress" | "completed" | "abandoned"
  questions: Array<{
    questionId: string
    correct: boolean
    timeSpent: number
  }>
  // Optional rating change resulting from this session (client-only tag)
  ratingChange?: number
}

export interface Question {
  id: string
  content: string
  language: "HTML" | "CSS" | "JavaScript"
  format: "MCQ" | "Fill in the Blank" | "Fix the Code"
  difficulty: "Easy" | "Medium" | "Hard"
  options: string[]
  correctAnswerIndex: number
  explanation?: string
  createdAt: Date
  tags?: string[]
  category?: string
}

interface ActiveGameSession {
  id: string
  userId: string
  mode: "3min" | "5min" | "survival"
  language: "HTML" | "CSS" | "JavaScript"
  score: number
  correctAnswers: number
  totalQuestions: number
  wrongAnswers: number
  accuracy: number
  timeLeft: number
  currentQuestionIndex: number
  answers: (number | null)[]
  gameOver: boolean
  questions: Question[]
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function shuffleOptions(question: Question): Question {
  const optionsWithIndices = question.options.map((opt, idx) => ({ opt, idx }))
  const shuffled = shuffleArray(optionsWithIndices)

  return {
    ...question,
    options: shuffled.map((item) => item.opt),
    correctAnswerIndex: shuffled.findIndex((item) => item.idx === question.correctAnswerIndex),
  }
}

export async function fetchRandomQuestions(
  language?: "HTML" | "CSS" | "JavaScript",
  format?: "MCQ" | "Fill in the Blank" | "Fix the Code",
  count = 10,
): Promise<Question[]> {
  try {
    // Build query with language and format filters
    const queryConstraints: any[] = []
    if (language) {
      queryConstraints.push(where("language", "==", language))
    }
    if (format) {
      queryConstraints.push(where("format", "==", format))
    }

    let q
    if (queryConstraints.length === 0) {
      // No filters, just get random questions
      q = query(
        collection(db, "questions"),
        limit(Math.max(count * 3, 50)),
      )
    } else if (queryConstraints.length === 1) {
      // Single filter
      q = query(
        collection(db, "questions"),
        queryConstraints[0],
        limit(Math.max(count * 3, 50)),
      )
    } else {
      // Multiple filters
      q = query(
        collection(db, "questions"),
        and(...queryConstraints),
        limit(Math.max(count * 3, 50)),
      )
    }

    const querySnapshot = await getDocs(q)
    const allQuestions = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || new Date(),
    })) as Question[]

    // Shuffle and return requested count, then shuffle options
    return shuffleArray(allQuestions)
      .slice(0, count)
      .map((q) => shuffleOptions(q))
  } catch (error) {
    console.error("[v0] Error fetching questions:", error)
    return []
  }
}

/**
 * Fetch balanced random questions from all languages (spread them out evenly)
 */
export async function fetchBalancedRandomQuestions(
  format?: "MCQ" | "Fill in the Blank" | "Fix the Code",
  count = 10,
): Promise<Question[]> {
  try {
    const languages: ("HTML" | "CSS" | "JavaScript")[] = ["HTML", "CSS", "JavaScript"]
    const questionsPerLanguage = Math.ceil(count / languages.length)
    const allFetchedQuestions: Question[] = []

    // Fetch from each language separately to ensure balance
    for (const lang of languages) {
      const queryConstraints: any[] = [where("language", "==", lang)]
      if (format) {
        queryConstraints.push(where("format", "==", format))
      }

      const q = query(
        collection(db, "questions"),
        queryConstraints.length === 1
          ? queryConstraints[0]
          : and(...queryConstraints),
        limit(Math.max(questionsPerLanguage * 3, 30)),
      )

      const querySnapshot = await getDocs(q)
      const langQuestions = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date(),
      })) as Question[]

      // Shuffle and take the needed amount from this language
      const shuffled = shuffleArray(langQuestions)
        .slice(0, questionsPerLanguage)
        .map((q) => shuffleOptions(q))

      allFetchedQuestions.push(...shuffled)
    }

    // Final shuffle to mix languages and return exactly count items
    return shuffleArray(allFetchedQuestions).slice(0, count)
  } catch (error) {
    console.error("[v0] Error fetching balanced random questions:", error)
    return []
  }
}

const CACHE_VERSION = 1
const CACHE_DB_NAME = "CodeRushCache"
const CACHE_STORE_NAME = "questions"

function getSessionCacheKey(language: string, format?: string): string {
  return format ? `${language}_${format}` : language
}

function getIndexedDBKey(language: string, format?: string): string {
  return getSessionCacheKey(language, format)
}

/**
 * Open IndexedDB with proper schema initialization
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB_NAME, CACHE_VERSION)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(CACHE_STORE_NAME)) {
        db.createObjectStore(CACHE_STORE_NAME, { keyPath: "key" })
      }
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onerror = () => {
      reject(request.error)
    }
  })
}

// Preload questions cache for faster gameplay
export async function preloadQuestionsCache(
  language: "HTML" | "CSS" | "JavaScript",
  format?: "MCQ" | "Fill in the Blank" | "Fix the Code",
  count = 20,
): Promise<Question[]> {
  try {
    const questions = await fetchRandomQuestions(language, format, count)
    const cacheKey = getSessionCacheKey(language, format)

    // Store in sessionStorage for immediate access
    sessionStorage.setItem(`questions_${cacheKey}`, JSON.stringify(questions))

    // Also store in IndexedDB for persistence across sessions
    if ("indexedDB" in window) {
      try {
        const db = await openIndexedDB()
        const transaction = db.transaction([CACHE_STORE_NAME], "readwrite")
        const store = transaction.objectStore(CACHE_STORE_NAME)
        store.put({
          key: getIndexedDBKey(language, format),
          questions,
          timestamp: Date.now(),
        })
      } catch (idbError) {
        console.warn("[v0] IndexedDB caching failed, falling back to sessionStorage:", idbError)
        // Continue anyway - sessionStorage is enough
      }
    }

    return questions
  } catch (error) {
    console.error("[v0] Error preloading questions:", error)
    return []
  }
}

// Get preloaded questions from cache (fastest → slowest)
export async function getCachedQuestions(language: string, format?: string): Promise<Question[]> {
  try {
    const cacheKey = getSessionCacheKey(language, format)

    // 1. Check sessionStorage first (fastest)
    const sessionCached = sessionStorage.getItem(`questions_${cacheKey}`)
    if (sessionCached) {
      return JSON.parse(sessionCached)
    }

    // 2. Check IndexedDB (if available)
    if ("indexedDB" in window) {
      return new Promise((resolve) => {
        try {
          openIndexedDB()
            .then((db) => {
              const transaction = db.transaction([CACHE_STORE_NAME], "readonly")
              const store = transaction.objectStore(CACHE_STORE_NAME)
              const getRequest = store.get(getIndexedDBKey(language, format))

              getRequest.onsuccess = () => {
                const result = getRequest.result
                if (result && result.questions) {
                  // Move back to sessionStorage for faster next access
                  sessionStorage.setItem(`questions_${cacheKey}`, JSON.stringify(result.questions))
                  resolve(result.questions)
                } else {
                  resolve([])
                }
              }

              getRequest.onerror = () => resolve([])
            })
            .catch(() => resolve([]))
        } catch {
          resolve([])
        }
      })
    }

    return []
  } catch (error) {
    console.error("[v0] Error reading question cache:", error)
    return []
  }
}

// Clear question cache
export function clearQuestionCache(language: string, format?: string) {
  const cacheKey = getSessionCacheKey(language, format)
  sessionStorage.removeItem(`questions_${cacheKey}`)

  // Also clear from IndexedDB
  if ("indexedDB" in window) {
    openIndexedDB()
      .then((db) => {
        const transaction = db.transaction([CACHE_STORE_NAME], "readwrite")
        const store = transaction.objectStore(CACHE_STORE_NAME)
        store.delete(getIndexedDBKey(language, format))
      })
      .catch((err) => console.warn("[v0] Failed to clear IndexedDB cache:", err))
  }
}

// Clear all question caches
export function clearAllQuestionCaches() {
  Object.keys(sessionStorage).forEach((key) => {
    if (key.startsWith("questions_")) {
      sessionStorage.removeItem(key)
    }
  })

  if ("indexedDB" in window) {
    openIndexedDB()
      .then((db) => {
        const transaction = db.transaction([CACHE_STORE_NAME], "readwrite")
        const store = transaction.objectStore(CACHE_STORE_NAME)
        store.clear()
      })
      .catch((err) => console.warn("[v0] Failed to clear IndexedDB caches:", err))
  }
}

export async function createGameSession(
  userId: string,
  mode: "3min" | "5min" | "survival",
  language: "HTML" | "CSS" | "JavaScript",
  format?: "MCQ" | "Fill in the Blank" | "Fix the Code",
): Promise<string> {
  // Build session payload here so catch block can access it for logging
  const sessionData: any = {
    userId,
    mode,
    language,
    startTime: serverTimestamp(),
    endTime: null,
    score: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    strikes: 0, // For survival mode
    status: "in_progress" as const,
    questions: [], // Will store question IDs and responses
    totalQuestions: 0,
    wrongAnswers: 0,
    accuracy: 0,
    timeLeft: mode === "3min" ? 180 : mode === "5min" ? 300 : 0, // For timed modes
    currentQuestionIndex: 0,
    answers: [],
    gameOver: false,
  }

  try {

    // Only include optional fields when defined to avoid Firestore rejecting undefined
    if (format !== undefined) sessionData.format = format

    console.log("[v0] Creating game session -> payload:", JSON.stringify(sessionData))
    const sessionRef = await addDoc(collection(db, "game_sessions"), sessionData)
    console.log("[v0] Created game session id:", sessionRef.id)
    return sessionRef.id
  } catch (error) {
    const e = error as any
    // Log full error info so developer can inspect Firestore permission failures
    try {
      console.error("[v0] Error creating game session:", {
        message: e?.message || e,
        code: e?.code || null,
        payload: sessionData,
      })
    } catch (logErr) {
      console.error("[v0] Error while logging createGameSession error:", logErr)
    }
    throw error
  }
}

export async function updateGameSession(
  sessionId: string,
  update: {
    endTime?: boolean;
    score?: number;
    questionsAnswered?: number;
    correctAnswers?: number;
    strikes?: number;
    status?: "in_progress" | "completed" | "abandoned";
    questions?: Array<{
      questionId: string;
      correct: boolean;
      timeSpent: number;
    }>;
    wrongAnswers?: number;
    accuracy?: number;
    timeLeft?: number;
    currentQuestionIndex?: number;
    answers?: (number | null)[];
    gameOver?: boolean;
  },
): Promise<boolean> {
  let updateData: any = {}
  try {
    
    if (update.endTime) updateData.endTime = serverTimestamp()
    if (update.score !== undefined) updateData.score = update.score
    if (update.questionsAnswered !== undefined) updateData.questionsAnswered = update.questionsAnswered
    if (update.correctAnswers !== undefined) updateData.correctAnswers = update.correctAnswers
    if (update.strikes !== undefined) updateData.strikes = update.strikes
    if (update.status) updateData.status = update.status
    if (update.questions) updateData.questions = arrayUnion(...update.questions)
    if (update.wrongAnswers !== undefined) updateData.wrongAnswers = update.wrongAnswers
    if (update.accuracy !== undefined) updateData.accuracy = update.accuracy
    if (update.timeLeft !== undefined) updateData.timeLeft = update.timeLeft
    if (update.currentQuestionIndex !== undefined) updateData.currentQuestionIndex = update.currentQuestionIndex
    if (update.answers) updateData.answers = update.answers
    if (update.gameOver !== undefined) updateData.gameOver = update.gameOver

    console.log("[v0] Updating game session", sessionId, "with:", JSON.stringify(updateData))
    await updateDoc(doc(db, "game_sessions", sessionId), updateData)
    console.log("[v0] updateGameSession succeeded", sessionId)
    return true
  } catch (error) {
    try {
      console.error("[v0] Error updating game session:", {
        message: error?.message || error,
        code: error?.code || null,
        sessionId,
        updateData,
      })
    } catch (logErr) {
      console.error("[v0] Error while logging updateGameSession error:", logErr)
    }
    throw error
  }
}

export async function getUserGameHistory(
  userId: string,
  gamesLimit = 20,
): Promise<GameSession[]> {
  try {
    const q = query(
      collection(db, "game_sessions"),
      where("userId", "==", userId),
      orderBy("startTime", "desc"),
      limit(gamesLimit),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as GameSession[]
  } catch (error) {
    console.error("[v0] Error fetching user game history:", error)
    return []
  }
}
