import { collection, doc, addDoc, updateDoc, query, where, getDocs, deleteDoc, onSnapshot, limit, orderBy, getDoc } from "firebase/firestore"
import { db } from "./firebase"

export interface Friend {
  id: string
  userId: string
  friendId: string
  friendUsername: string
  friendElo: number
  friendProfilePic?: string
  status: "pending" | "accepted" | "blocked"
  createdAt: number
  acceptedAt?: number
}

export interface UserStatus {
  uid: string
  status: "online" | "offline" | "in-game"
  lastSeen: number
  currentMatchId?: string
}

export interface Notification {
  id: string
  userId: string
  type:
    | "friend_request_received"
    | "friend_request_accepted"
    | "friend_request_rejected"
    | "challenge_received"
    | "challenge_accepted"
    | "challenge_declined"
  fromUserId: string
  fromUsername?: string
  // Optional extra payload for challenge metadata (mode, language, challengeId)
  details?: any
  read: boolean
  createdAt: number
}

// Update user online status
export async function updateUserStatus(
  userId: string,
  status: "online" | "offline" | "in-game",
  currentMatchId?: string,
): Promise<void> {
  try {
    const statusRef = doc(db, "user-status", userId)
    await updateDoc(statusRef, {
      status,
      lastSeen: Date.now(),
      currentMatchId: currentMatchId || null,
    }).catch(async () => {
      // Create if doesn't exist
      await addDoc(collection(db, "user-status"), {
        uid: userId,
        status,
        lastSeen: Date.now(),
        currentMatchId: currentMatchId || null,
      })
    })
  } catch (error) {
    console.error("[v0] Error updating user status:", error)
  }
}

// Listen to friend's status in real-time
export function listenToFriendStatus(friendId: string, callback: (status: UserStatus | null) => void): () => void {
  try {
    console.log(`[v0] Setting up listenToFriendStatus for ${friendId}`)
    const unsubscribe = onSnapshot(
      doc(db, "user-status", friendId),
      (snapshot) => {
        console.log(`[v0] listenToFriendStatus snapshot for ${friendId}: exists=${snapshot.exists()}`)
        if (snapshot.exists()) {
          callback(snapshot.data() as UserStatus)
        } else {
          callback(null)
        }
      },
      (error) => {
        console.error(`[v0] Error in listenToFriendStatus for ${friendId}:`, error)
        callback(null)
      },
    )
    return unsubscribe
  } catch (error) {
    console.error("[v0] Error setting up listenToFriendStatus:", error)
    return () => {}
  }
}

// Search users by username
export async function searchUsers(username: string, excludeIds: string[] = []): Promise<any[]> {
  try {
    console.log("[searchUsers] Starting search for:", username)
    console.log("[searchUsers] Excluding IDs:", excludeIds)
    
    const searchLower = username.toLowerCase()
    console.log("[searchUsers] Search term (lowercase):", searchLower)
    
    // Try new schema first (with username_lower)
    let q = query(
      collection(db, "users"),
      where("username_lower", ">=", searchLower),
      where("username_lower", "<=", searchLower + "\uf8ff"),
      limit(10)
    )
    
    console.log("[searchUsers] Query constructed, executing getDocs...")
    let querySnapshot = await getDocs(q)
    
    // If no results, try old schema (where username is all lowercase)
    if (querySnapshot.empty) {
      console.log("[searchUsers] No results with username_lower, trying old schema...")
      q = query(
        collection(db, "users"),
        where("username", ">=", searchLower),
        where("username", "<=", searchLower + "\uf8ff"),
        limit(10)
      )
      querySnapshot = await getDocs(q)
    }
    
    console.log("[searchUsers] Query returned", querySnapshot.docs.length, "documents")

    const results = querySnapshot.docs
      .map((doc) => {
        const data = doc.data()
        console.log("[searchUsers] Processing document:", {
          uid: doc.id,
          username: data.username,
          hasProfilePicture: !!data.profilePicture,
        })
        const lr = data.languageRatings || {}
        const highest = Math.max(lr.HTML ?? 400, lr.CSS ?? 400, lr.JavaScript ?? 400)
        return {
          uid: doc.id,
          username: data.username,
          profilePicture: data.profilePicture,
          eloRating: highest,
        }
      })
      .filter((user) => {
        const isExcluded = excludeIds.includes(user.uid)
        console.log("[searchUsers] Filtering user", user.username, "- excluded:", isExcluded)
        return !isExcluded
      })

    console.log("[searchUsers] Final results after filtering:", results.length, "users")
    return results
  } catch (error) {
    console.error("[searchUsers] Error searching users:", error)
    if (error instanceof Error) {
      console.error("[searchUsers] Error message:", error.message)
      console.error("[searchUsers] Error code:", (error as any).code)
    }
    return []
  }
}

// Send friend request
export async function sendFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    // First, get the sender's username
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", userId)))
    const senderUsername = userDoc.docs[0]?.data().username || "Unknown"

    const friendRef = collection(db, "friends")
    await addDoc(friendRef, {
      userId,
      friendId,
      friendUsername: senderUsername,
      status: "pending",
      createdAt: Date.now(),
    })

    // Create notification for the recipient
    await createNotification(friendId, "friend_request_received", userId, senderUsername)
  } catch (error) {
    console.error("[v0] Error sending friend request:", error)
    throw error
  }
}

// Get user's friends list
export async function getUserFriends(userId: string): Promise<Friend[]> {
  try {
    const q = query(collection(db, "friends"), where("userId", "==", userId), where("status", "==", "accepted"))

    const querySnapshot = await getDocs(q)
    // Enrich friend entries with the friend's current username/profile picture
    const friends = querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Friend[]
    const enriched: Friend[] = []
    for (const f of friends) {
      try {
        const userRef = doc(db, "users", f.friendId)
        const userSnap = await getDoc(userRef)
        const friendUsername = userSnap.exists() ? (userSnap.data() as any).username : f.friendUsername
        const friendProfilePic = userSnap.exists() ? (userSnap.data() as any).profilePicture : f.friendProfilePic
        enriched.push({ ...f, friendUsername, friendProfilePic })
      } catch (e) {
        console.error('[v0] Error enriching friend data:', e)
        enriched.push(f)
      }
    }
    return enriched
  } catch (error) {
    console.error("[v0] Error getting friends:", error)
    return []
  }
}

// Get recent notifications for a user (read + unread)
export async function getUserNotifications(userId: string, limitCount = 20): Promise<Notification[]> {
  try {
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Notification[]
  } catch (error) {
    console.error("[v0] Error getting user notifications:", error)
    return []
  }
}

// Listen to friends list in real-time
export function listenToFriends(userId: string, callback: (friends: Friend[]) => void): () => void {
  try {
    console.log(`[v0] Setting up listenToFriends for ${userId}`)
    const q = query(collection(db, "friends"), where("userId", "==", userId), where("status", "==", "accepted"))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[v0] listenToFriends snapshot for ${userId}: docs=${snapshot.docs.length}`)
        const friends = snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Friend[]
        // Enrich friend entries asynchronously with the friend's username/profile
        Promise.all(
          friends.map(async (f) => {
            try {
              const userRef = doc(db, "users", f.friendId)
              const userSnap = await getDoc(userRef)
              const friendUsername = userSnap.exists() ? (userSnap.data() as any).username : f.friendUsername
              const friendProfilePic = userSnap.exists() ? (userSnap.data() as any).profilePicture : f.friendProfilePic
              return { ...f, friendUsername, friendProfilePic } as Friend
            } catch (e) {
              console.error('[v0] Error enriching friend in listener:', e)
              return f
            }
          }),
        )
          .then((enriched) => callback(enriched))
          .catch((e) => {
            console.error('[v0] Error completing friend enrichment:', e)
            callback(friends)
          })
      },
      (error) => {
        console.error(`[v0] Error in listenToFriends for ${userId}:`, error)
        callback([])
      },
    )

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error setting up listenToFriends:", error)
    return () => {}
  }
}

// Reject friend request
export async function rejectFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    const q = query(
      collection(db, "friends"),
      where("userId", "==", friendId),
      where("friendId", "==", userId),
      where("status", "==", "pending"),
    )
    const querySnapshot = await getDocs(q)
    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref)
    }
  } catch (error) {
    console.error("[v0] Error rejecting friend request:", error)
    throw error
  }
}

// Accept friend request (updated to work with userId/friendId)
export async function acceptFriendRequest(userId: string, friendId: string): Promise<void> {
  try {
    console.log(`[v0] acceptFriendRequest called by ${userId} for request from ${friendId}`)
    // Get current user's username for notification
    const userDoc = await getDocs(query(collection(db, "users"), where("uid", "==", userId)))
    const accepterUsername = userDoc.docs[0]?.data().username || "Unknown"

    const q = query(
      collection(db, "friends"),
      where("userId", "==", friendId),
      where("friendId", "==", userId),
      where("status", "==", "pending"),
    )
    const querySnapshot = await getDocs(q)
    console.log(`[v0] acceptFriendRequest found ${querySnapshot.docs.length} pending docs`)
    for (const doc of querySnapshot.docs) {
      await updateDoc(doc.ref, {
        status: "accepted",
        acceptedAt: Date.now(),
      })
    }

    // Ensure reciprocal friend document exists so both users see each other in their friend lists
    try {
      for (const docSnap of querySnapshot.docs) {
        const data = docSnap.data() as any
        const reciprocalQ = query(
          collection(db, "friends"),
          where("userId", "==", userId),
          where("friendId", "==", friendId),
        )
        const reciprocalSnapshot = await getDocs(reciprocalQ)
        if (reciprocalSnapshot.empty) {
          // Create reciprocal accepted friendship using canonical user data when available
          try {
            const userRef = doc(db, "users", friendId)
            const userSnap = await getDoc(userRef)
            const canonicalUsername = userSnap.exists() ? (userSnap.data() as any).username : (data.friendUsername || accepterUsername)
            const canonicalProfilePic = userSnap.exists() ? (userSnap.data() as any).profilePicture ?? null : (data.friendProfilePic || null)
            const canonicalElo = userSnap.exists() ? (() => { const lr = (userSnap.data() as any).languageRatings || {}; return Math.max(lr.HTML ?? 400, lr.CSS ?? 400, lr.JavaScript ?? 400) })() : (typeof data.friendElo === 'number' ? data.friendElo : 400)

            await addDoc(collection(db, "friends"), {
              userId: userId,
              friendId: friendId,
              friendUsername: canonicalUsername,
              // Prefer canonical elo when present
              friendElo: canonicalElo,
              friendProfilePic: canonicalProfilePic,
              status: "accepted",
              createdAt: Date.now(),
              acceptedAt: Date.now(),
            })
          } catch (e) {
            console.error('[v0] Error creating reciprocal friendship with canonical data:', e)
            // Fallback to original behavior
            await addDoc(collection(db, "friends"), {
              userId: userId,
              friendId: friendId,
              friendUsername: data.friendUsername || accepterUsername,
              friendElo: typeof data.friendElo === 'number' ? data.friendElo : 400,
              friendProfilePic: data.friendProfilePic || null,
              status: "accepted",
              createdAt: Date.now(),
              acceptedAt: Date.now(),
            })
          }
        } else {
          // If reciprocal exists but not accepted, ensure it is marked accepted
          for (const r of reciprocalSnapshot.docs) {
            const rdata = r.data()
            // Build update payload and enrich from canonical user data when possible
            const updates: any = { status: "accepted", acceptedAt: Date.now() }
            try {
              const userRef = doc(db, "users", friendId)
              const userSnap = await getDoc(userRef)
              if (userSnap.exists()) {
                const ud = userSnap.data() as any
                updates.friendUsername = ud.username ?? (rdata.friendUsername || data.friendUsername || accepterUsername)
                updates.friendProfilePic = ud.profilePicture ?? (rdata.friendProfilePic || data.friendProfilePic || null)
                updates.friendElo = ud.languageRatings ? Math.max(ud.languageRatings.HTML ?? 400, ud.languageRatings.CSS ?? 400, ud.languageRatings.JavaScript ?? 400) : (typeof rdata.friendElo === 'number' ? rdata.friendElo : (typeof data.friendElo === 'number' ? data.friendElo : 400))
              } else {
                updates.friendUsername = rdata.friendUsername || data.friendUsername || accepterUsername
                updates.friendProfilePic = rdata.friendProfilePic || data.friendProfilePic || null
                updates.friendElo = typeof rdata.friendElo === 'number' ? rdata.friendElo : (typeof data.friendElo === 'number' ? data.friendElo : 400)
              }
            } catch (e) {
              console.error('[v0] Error enriching reciprocal friendship during update:', e)
              updates.friendUsername = rdata.friendUsername || data.friendUsername || accepterUsername
              updates.friendProfilePic = rdata.friendProfilePic || data.friendProfilePic || null
              updates.friendElo = typeof rdata.friendElo === 'number' ? rdata.friendElo : (typeof data.friendElo === 'number' ? data.friendElo : 400)
            }
            await updateDoc(r.ref, updates)
          }
        }
      }
    } catch (e) {
      console.error('[v0] Error creating reciprocal friendship record:', e)
    }
    // Send notification to the original requester
    try {
      await createNotification(friendId, "friend_request_accepted", userId, accepterUsername)
    } catch (notifErr) {
      console.error("[v0] createNotification failed during acceptFriendRequest:", notifErr)
    }
  } catch (error) {
    console.error("[v0] Error accepting friend request:", error)
    throw error
  }
}

// Check friend request status
export async function checkFriendRequestStatus(
  userId: string,
  friendId: string,
): Promise<"none" | "pending" | "accepted"> {
  try {
    // Check if they are friends
    const q1 = query(
      collection(db, "friends"),
      where("userId", "==", userId),
      where("friendId", "==", friendId),
      where("status", "==", "accepted"),
    )
    const result1 = await getDocs(q1)
    if (!result1.empty) return "accepted"

    // Check if there's a pending request from friendId to userId
    const q2 = query(
      collection(db, "friends"),
      where("userId", "==", friendId),
      where("friendId", "==", userId),
      where("status", "==", "pending"),
    )
    const result2 = await getDocs(q2)
    if (!result2.empty) return "pending"

    return "none"
  } catch (error) {
    console.error("[v0] Error checking friend request status:", error)
    return "none"
  }
}

// Listen to friend request status in real-time
export function listenToFriendRequest(
  userId: string,
  friendId: string,
  callback: (status: "none" | "pending" | "accepted") => void,
): () => void {
  try {
    // Listen to accepted friend relationship
    const q1 = query(
      collection(db, "friends"),
      where("userId", "==", userId),
      where("friendId", "==", friendId),
      where("status", "==", "accepted"),
    )

    console.log(`[v0] Setting up listenToFriendRequest between ${userId} and ${friendId}`)
    const unsubscribe1 = onSnapshot(
      q1,
      (snapshot) => {
        console.log(`[v0] listenToFriendRequest q1 snapshot: docs=${snapshot.docs.length}`)
        if (!snapshot.empty) {
          callback("accepted")
          return
        }

        // Listen to pending friend request
        const q2 = query(
          collection(db, "friends"),
          where("userId", "==", friendId),
          where("friendId", "==", userId),
          where("status", "==", "pending"),
        )

        const unsubscribe2 = onSnapshot(
          q2,
          (snapshot2) => {
            console.log(`[v0] listenToFriendRequest q2 snapshot: docs=${snapshot2.docs.length}`)
            callback(!snapshot2.empty ? "pending" : "none")
          },
          (error) => {
            console.error(`[v0] Error in pending request listener between ${userId} and ${friendId}:`, error)
            callback("none")
          },
        )

        return () => unsubscribe2()
      },
      (error) => {
        console.error(`[v0] Error in listenToFriendRequest for ${userId}/${friendId}:`, error)
        callback("none")
      },
    )

    return unsubscribe1
  } catch (error) {
    console.error("[v0] Error listening to friend request:", error)
    return () => {}
  }
}

// Get friend count
export async function getFriendCount(userId: string): Promise<number> {
  try {
    const q = query(collection(db, "friends"), where("userId", "==", userId), where("status", "==", "accepted"))
    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.length
  } catch (error) {
    console.error("[v0] Error getting friend count:", error)
    return 0
  }
}

// Fetch multiple user docs by id and return a mapping of uid -> { eloRating, profilePicture, username }
export async function getUsersByIds(ids: string[]): Promise<Record<string, { eloRating: number; profilePicture?: string | null; username?: string }>> {
  const result: Record<string, { eloRating: number; profilePicture?: string | null; username?: string }> = {}
  try {
    if (!ids || ids.length === 0) return result
    // Use Promise.all to fetch each user doc (client-side Firestore doesn't support batch-get by IDs in a single query)
    await Promise.all(
      ids.map(async (uid) => {
        try {
          const userRef = doc(db, "users", uid)
          const snap = await getDoc(userRef)
          if (snap.exists()) {
            const data = snap.data() as any
            const lr = data.languageRatings || {}
            const highest = Math.max(lr.HTML ?? 400, lr.CSS ?? 400, lr.JavaScript ?? 400)
            result[uid] = {
              eloRating: highest,
              profilePicture: data.profilePicture ?? null,
              username: data.username ?? undefined,
            }
          } else {
            // Default when user doc not found
            result[uid] = { eloRating: 400 }
          }
        } catch (e) {
          console.error('[v0] Error fetching user', uid, e)
          result[uid] = { eloRating: 400 }
        }
      }),
    )
    return result
  } catch (error) {
    console.error('[v0] getUsersByIds error:', error)
    return result
  }
}

// Remove friend
export async function removeFriend(friendshipId: string): Promise<void> {
  try {
    // Delete the primary friendship document by id
    const primaryRef = doc(db, "friends", friendshipId)
    const primarySnap = await getDoc(primaryRef)

    if (!primarySnap.exists()) {
      console.warn(`[v0] removeFriend: friendship doc ${friendshipId} not found`)
      return
    }

    const data = primarySnap.data() as any
    const userId = data.userId
    const friendId = data.friendId

    // Delete the primary doc
    await deleteDoc(primaryRef)

    // Also delete any reciprocal friendship documents (userId: friendId, friendId: userId)
    try {
      const reciprocalQ = query(
        collection(db, "friends"),
        where("userId", "==", friendId),
        where("friendId", "==", userId),
      )
      const reciprocalSnapshot = await getDocs(reciprocalQ)
      for (const r of reciprocalSnapshot.docs) {
        await deleteDoc(r.ref)
      }
    } catch (e) {
      console.error("[v0] Error deleting reciprocal friendship docs:", e)
    }
  } catch (error) {
    console.error("[v0] Error removing friend:", error)
    throw error
  }
}

// Create notification
export async function createNotification(
  userId: string,
  type: "friend_request_received" | "friend_request_accepted" | "friend_request_rejected" | "challenge_received" | "challenge_accepted" | "challenge_declined",
  fromUserId: string,
  fromUsername?: string,
  details?: any,
): Promise<string> {
  try {
    const payload: any = {
      userId,
      type,
      fromUserId,
      fromUsername,
      read: false,
      createdAt: Date.now(),
    }

    // Only include details when defined; Firestore disallows undefined values
    if (typeof details !== "undefined") {
      payload.details = details
    }

    const docRef = await addDoc(collection(db, "notifications"), payload)
    return docRef.id
  } catch (error) {
    console.error("[v0] Error creating notification:", error)
    throw error
  }
}

// Listen to incoming friend requests (for notifications)
export function listenToIncomingFriendRequests(
  userId: string,
  callback: (requests: Array<{ friendId: string; friendUsername: string }>) => void,
): () => void {
  try {
    console.log(`[v0] Setting up listenToIncomingFriendRequests for ${userId}`)
    const q = query(
      collection(db, "friends"),
      where("friendId", "==", userId),
      where("status", "==", "pending"),
    )

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[v0] listenToIncomingFriendRequests snapshot for ${userId}: docs=${snapshot.docs.length}`)
        const requests = snapshot.docs.map((doc) => ({
          friendId: doc.data().userId,
          friendUsername: doc.data().friendUsername || "Unknown",
        }))
        callback(requests)
      },
      (error) => {
        console.error(`[v0] Error in listenToIncomingFriendRequests for ${userId}:`, error)
        callback([])
      },
    )

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to incoming requests:", error)
    return () => {}
  }
}

// Listen to unread notifications
export function listenToUnreadNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
): () => void {
  try {
    console.log(`[v0] Setting up listenToUnreadNotifications for ${userId}`)
    const q = query(collection(db, "notifications"), where("userId", "==", userId), where("read", "==", false))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        console.log(`[v0] listenToUnreadNotifications snapshot for ${userId}: docs=${snapshot.docs.length}`)
        const notifications = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Notification[]
        callback(notifications)
      },
      (error) => {
        console.error(`[v0] Error in listenToUnreadNotifications for ${userId}:`, error)
        callback([])
      },
    )

    return unsubscribe
  } catch (error) {
    console.error("[v0] Error listening to notifications:", error)
    return () => {}
  }
}

// Mark notification as read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
  try {
    await updateDoc(doc(db, "notifications", notificationId), {
      read: true,
    })
  } catch (error) {
    console.error("[v0] Error marking notification as read:", error)
    throw error
  }
}

// Delete notification
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "notifications", notificationId))
  } catch (error) {
    console.error("[v0] Error deleting notification:", error)
    throw error
  }
}

// Clean up read notifications older than 3 days (run periodically via a scheduled function or cron)
export async function cleanupOldReadNotifications(): Promise<number> {
  try {
    const threeDaysAgo = Date.now() - 3 * 24 * 60 * 60 * 1000
    const q = query(
      collection(db, "notifications"),
      where("read", "==", true),
      where("createdAt", "<", threeDaysAgo)
    )

    const querySnapshot = await getDocs(q)
    let count = 0
    for (const doc of querySnapshot.docs) {
      try {
        await deleteDoc(doc.ref)
        count++
      } catch (e) {
        console.error("[v0] Error deleting old notification doc:", e)
      }
    }
    console.log(`[v0] cleanupOldReadNotifications deleted ${count} notifications`)
    return count
  } catch (error) {
    console.error("[v0] Error running cleanupOldReadNotifications:", error)
    return 0
  }
}
