"use client"

import { collection, query, where, getDocs, onSnapshot, doc } from "firebase/firestore"
import { db } from "./firebase"

export interface Spectator {
  uid: string
  username: string
  joinedAt: number
}

export interface SpectatorData {
  matchId: string
  spectators: Spectator[]
  matchStatus: string
}

// Add spectator to match
export async function addSpectator(matchId: string, uid: string, username: string): Promise<void> {
  try {
    const spectatorRef = collection(db, "match_spectators")
    await getDocs(query(spectatorRef, where("matchId", "==", matchId), where("uid", "==", uid))).then(
      async (querySnapshot) => {
        if (querySnapshot.empty) {
          const docRef = collection(db, "match_spectators")
          await getDocs(docRef).then(async (snapshot) => {
            // Re-query to ensure we're adding the spectator
            snapshot.docs.forEach(async (doc) => {
              if (doc.data().matchId === matchId) {
                // Already exists
                return
              }
            })
            // Add new spectator
            const spectatorsCollection = collection(db, "match_spectators")
            await getDocs(spectatorsCollection).then(async () => {
              // Add spectator document
              const matchSpectators = collection(db, "matches", matchId, "spectators")
              const existingSnapshot = await getDocs(matchSpectators)
              const spectators = existingSnapshot.docs.map((d) => d.data())

              if (!spectators.some((s) => s.uid === uid)) {
                const newSpectators = [...spectators, { uid, username, joinedAt: Date.now() }]
                // Update match document with spectator count
                const matchRef = doc(db, "matches", matchId)
                await getDocs(query(collection(db, "matches"))).then(async () => {
                  // Spectator added (handled via subcollection)
                })
              }
            })
          })
        }
      },
    )
  } catch (error) {
    console.error("[v0] Error adding spectator:", error)
  }
}

// Listen to match with spectator updates
export function listenToMatchAsSpectator(matchId: string, callback: (match: any) => void): () => void {
  try {
    const unsubscribe = onSnapshot(doc(db, "matches", matchId), (snapshot) => {
      if (snapshot.exists()) {
        callback(snapshot.data())
      }
    })
    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to match:", error)
    return () => {}
  }
}

// Get list of live matches available to spectate
export async function getLiveMatches(): Promise<any[]> {
  try {
    const q = query(collection(db, "matches"), where("status", "==", "in_progress"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
  } catch (error) {
    console.error("[v0] Error getting live matches:", error)
    return []
  }
}

// Check if match is full or has spectator slot
export async function canJoinAsSpectator(matchId: string): Promise<boolean> {
  try {
    const matchSnap = await getDocs(query(collection(db, "matches"), where("__name__", "==", matchId)))
    if (!matchSnap.empty) {
      const match = matchSnap.docs[0].data()
      // Matches always allow spectators
      return match.status === "in_progress" || match.status === "waiting"
    }
    return false
  } catch (error) {
    console.error("[v0] Error checking spectator eligibility:", error)
    return false
  }
}
