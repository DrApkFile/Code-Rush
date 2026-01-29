"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { doc, getDoc, query, collection, where, getDocs, orderBy, limit } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, Loader2, Check, Users, Trophy, Target } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useToast } from "@/components/ui/use-toast"
import GameHistoryRow from "@/components/dashboard/game-history-row"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import {
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  listenToFriendStatus,
  type UserStatus,
  getUserFriends,
  checkFriendRequestStatus,
  listenToFriendRequest,
  getFriendCount,
} from "@/lib/friends-queries"

interface UserProfile {
  uid: string
  username: string
  email: string
  bio?: string
  profilePicture?: string
  languageRatings: Record<string, number>
  createdAt: number
  updatedAt: number
}

interface Match {
  id: string
  player1: {
    uid: string
    username: string
    score: number
    correctAnswers: number
    wrongAnswers: number
  }
  language: "HTML" | "CSS" | "JavaScript"
  mode: string
  gameMode?: "3min" | "5min" | "survival"
  status: "completed"
  createdAt: number
  endedAt?: number
  winner?: string
  results?: {
    player1: { score: number; accuracy: number; correctAnswers: number }
    player2?: { score: number; accuracy: number; correctAnswers: number }
  }
  ratingChange?: number
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, userProfile } = useAuth()
  const { toast } = useToast()
  const username = params.userId as string // This is actually the username from URL

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [status, setStatus] = useState<UserStatus | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [friendCount, setFriendCount] = useState(0)
  const [matches, setMatches] = useState<Match[]>([])
  const [gameHistory, setGameHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted">("none")

  // First, resolve username to userId, then fetch profile
  useEffect(() => {
    const resolveUsernameAndFetchProfile = async () => {
      try {
        setLoading(true)
        
        // Try to find user by username (case-insensitive)
        const searchLower = username.toLowerCase()
        let q = query(collection(db, "users"), where("username_lower", "==", searchLower))
        let querySnapshot = await getDocs(q)
        
        // If not found, try old schema
        if (querySnapshot.empty) {
          q = query(collection(db, "users"), where("username", "==", searchLower))
          querySnapshot = await getDocs(q)
        }
        
        if (querySnapshot.empty) {
          throw new Error("User not found")
        }
        
        const foundUserId = querySnapshot.docs[0].id
        setUserId(foundUserId)
        
        const docSnap = querySnapshot.docs[0]
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile)
        }
      } catch (error) {
        console.error("[Profile] Error fetching profile:", error)
        toast({
          title: "Error",
          description: "Failed to load profile",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    if (username && username !== user?.uid) {
      resolveUsernameAndFetchProfile()
    }
  }, [username, user?.uid, toast])

  // Listen to user status
  useEffect(() => {
    if (!userId) return
    const unsubscribe = listenToFriendStatus(userId, setStatus)
    return () => unsubscribe()
  }, [userId])

  // Fetch friends list
  useEffect(() => {
    const fetchFriends = async () => {
      if (!userId) return
      try {
        const userFriends = await getUserFriends(userId)
        setFriends(userFriends)
        const count = await getFriendCount(userId)
        setFriendCount(count)
      } catch (error) {
        console.error("[Profile] Error fetching friends:", error)
      }
    }

    if (userId) {
      fetchFriends()
    }
  }, [userId])

  // Fetch recent matches
  useEffect(() => {
    const fetchMatches = async () => {
      if (!userId) return
      try {
        // Fetch user's solo matches (canonical final match records)
        const history = await getUserSoloMatches(userId, 20)
        setGameHistory(history)
      } catch (error) {
        console.error("[Profile] Error fetching game history:", error)
      }
    }

    if (userId) {
      fetchMatches()
    }
  }, [userId])

  // Check friend request status
  useEffect(() => {
    if (!user?.uid || !userId || user.uid === userId) return

    const unsubscribe = listenToFriendRequest(user.uid, userId, (status) => {
      setFriendStatus(status)
    })

    return () => unsubscribe()
  }, [user?.uid, userId])

  const handleAddFriend = async () => {
    if (!user?.uid || !userId) return

    setActionLoading(true)
    try {
      await sendFriendRequest(user.uid, userId)
      setFriendStatus("pending")
      toast({
        title: "Friend request sent",
        description: `Request sent to ${profile?.username}`,
      })
    } catch (error) {
      console.error("[Profile] Error sending friend request:", error)
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleAcceptRequest = async () => {
    if (!user?.uid || !userId) return

    setActionLoading(true)
    try {
      await acceptFriendRequest(user.uid, userId)
      setFriendStatus("accepted")
      toast({
        title: "Friend request accepted",
        description: `You are now friends with ${profile?.username}`,
      })
    } catch (error) {
      console.error("[Profile] Error accepting request:", error)
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const handleRejectRequest = async () => {
    if (!user?.uid || !userId) return

    setActionLoading(true)
    try {
      await rejectFriendRequest(user.uid, userId)
      setFriendStatus("none")
      toast({
        title: "Friend request rejected",
        description: "Request has been declined",
      })
    } catch (error) {
      console.error("[Profile] Error rejecting request:", error)
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      })
    } finally {
      setActionLoading(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500"
      case "in-game":
        return "bg-blue-500"
      default:
        return "bg-gray-400"
    }
  }

  const getStatusText = (status?: string) => {
    switch (status) {
      case "online":
        return "Online"
      case "in-game":
        return "In Game"
      default:
        return "Offline"
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">User not found</p>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const isOwnProfile = user?.uid === userId
  const isOnline = status?.status === "online" || status?.status === "in-game"

  return (
    <div className="space-y-6 p-4">
      {/* Back Button */}
      <Button variant="ghost" className="gap-2" onClick={() => router.back()}>
        <ChevronLeft className="h-4 w-4" /> Back
      </Button>

      {/* Profile Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Header with Profile Pic and Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="relative">
                  {profile.profilePicture ? (
                    <Image
                      src={profile.profilePicture}
                      alt={profile.username}
                      width={100}
                      height={100}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center text-3xl font-bold">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white ${getStatusColor(status?.status)}`} />
                </div>
                <div className="space-y-2">
                  <div>
                    <h1 className="text-3xl font-bold">{profile.username}</h1>
                    <p className="text-sm text-muted-foreground">{getStatusText(status?.status)}</p>
                  </div>
                  {profile.bio && <p className="text-sm">{profile.bio}</p>}
                </div>
              </div>

              {/* Action Buttons */}
              {!isOwnProfile && (
                <div className="flex gap-2">
                  {friendStatus === "none" && (
                    <Button onClick={handleAddFriend} disabled={actionLoading}>
                      {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Friend"}
                    </Button>
                  )}
                  {friendStatus === "pending" && (
                    <Button disabled className="gap-2">
                      <Check className="h-4 w-4" /> Request Pending
                    </Button>
                  )}
                  {friendStatus === "accepted" && (
                      <div className="flex gap-2">
                        <Link href={`/dashboard/challenge?friendId=${userId}`}>
                          <Button disabled={!isOnline}>
                            {status?.status === "in-game" ? "In Game" : status?.status === "offline" ? "Offline" : "Challenge"}
                          </Button>
                        </Link>
                        <Button variant="outline" disabled className="gap-2">
                          <Check className="h-4 w-4" /> Friends
                        </Button>
                      </div>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Friends</p>
                <p className="text-2xl font-bold">{friendCount}</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="text-xs font-semibold">{new Date(profile.createdAt).toLocaleDateString()}</p>
              </div>
            </div>

            {/* Language Ratings */}
            <div className="space-y-2">
              <h3 className="font-semibold">Language Ratings</h3>
              <div className="grid grid-cols-3 gap-2">
                {["HTML", "CSS", "JavaScript"].map((lang) => (
                  <div key={lang} className="p-3 bg-muted rounded-lg text-center">
                    <p className="text-xs text-muted-foreground">{lang}</p>
                    <p className="text-lg font-bold">{profile.languageRatings?.[lang] || 400}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Friends List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Friends ({friendCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {friends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends yet</p>
          ) : (
            <div className="space-y-2">
              {friends.map((friend) => (
                <Link
                  key={friend.friendId}
                  href={`/dashboard/profile/${friend.friendUsername}`}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    {friend.friendProfilePic ? (
                      <Image
                        src={friend.friendProfilePic}
                        alt={friend.friendUsername}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                        {friend.friendUsername[0].toUpperCase()}
                      </div>
                    )}
                    <p className="font-medium">{friend.friendUsername}</p>
                  </div>
                  <Badge variant="outline">{friend.friendElo}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Match History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Recent Matches
          </CardTitle>
        </CardHeader>
        <CardContent>
          {gameHistory.length === 0 ? (
            <p className="text-sm text-muted-foreground">No matches yet</p>
          ) : (
            <div className="space-y-1">
              {gameHistory.map((game) => (
                <div 
                  key={game.id}
                  onClick={() => router.push(`/dashboard/profile/${userId}/match/${game.id}`)}
                  className="cursor-pointer"
                >
                  <GameHistoryRow 
                    game={game} 
                    currentRating={(profile?.languageRatings as any)?.[game.language] ?? 400}
                    matchId={game.id}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}