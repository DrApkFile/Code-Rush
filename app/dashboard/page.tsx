"use client"

import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, Calendar, Trophy, Target, Clock, Code, Bell } from "lucide-react"
import GameHistoryRow from "@/components/dashboard/game-history-row"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { useEffect, useState } from "react"
import { getUserSoloMatches } from "@/lib/multiplayer-queries"
import {
  listenToFriends,
  listenToFriendStatus,
  listenToUnreadNotifications,
  markNotificationAsRead,
  getUserNotifications,
  acceptFriendRequest,
  rejectFriendRequest,
  createNotification,
  cleanupOldReadNotifications,
  deleteNotification,
  type Friend,
  type UserStatus,
  type Notification,
} from "@/lib/friends-queries"
import { acceptChallenge, declineChallenge } from "@/lib/friend-challenges"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"

export default function DashboardPage() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const [recentGames, setRecentGames] = useState<any[]>([])
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendStatuses, setFriendStatuses] = useState<Record<string, UserStatus>>({})
  const [unreadNotifications, setUnreadNotifications] = useState<Notification[]>([])
  const [allNotifications, setAllNotifications] = useState<Notification[]>([])
  const [bellOpen, setBellOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Fetch recent games
  useEffect(() => {
    if (!userProfile?.uid) return
    
    async function loadGames() {
      try {
        const games = await getUserSoloMatches(userProfile!.uid, 5) // Get last 5 games
        setRecentGames(games)
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error loading games:", error)
        setLoading(false)
      }
    }

    loadGames()
  }, [userProfile?.uid])

  // Listen to friends list and their statuses
  useEffect(() => {
    if (!userProfile?.uid) return

    const unsubscribe = listenToFriends(userProfile.uid, (friendsList) => {
      setFriends(friendsList)

      // Listen to each friend's status
      friendsList.forEach((friend) => {
        listenToFriendStatus(friend.friendId, (status) => {
          if (status) {
            setFriendStatuses((prev) => ({
              ...prev,
              [friend.friendId]: status,
            }))
          }
        })
      })
    })

    return () => unsubscribe()
  }, [userProfile?.uid])

  // Listen to unread notifications for the toast bell
  useEffect(() => {
    if (!userProfile?.uid) return

    const unsubscribe = listenToUnreadNotifications(userProfile.uid, (notes) => {
      setUnreadNotifications(notes)
    })

    return () => unsubscribe()
  }, [userProfile?.uid])

  // Periodically clean up old read notifications (every 24 hours)
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        await cleanupOldReadNotifications()
      } catch (err) {
        console.error('[v0] Error running cleanup:', err)
      }
    }, 24 * 60 * 60 * 1000) // 24 hours

    return () => clearInterval(interval)
  }, [])

  const handleBellClick = async () => {
    // Toggle dropdown; when opening, fetch recent notifications
    const opening = !bellOpen
    setBellOpen(opening)
    if (opening && userProfile?.uid) {
      try {
        const notes = await getUserNotifications(userProfile.uid, 50)
        setAllNotifications(notes)
      } catch (err) {
        console.error('[v0] Error fetching notifications for bell:', err)
      }
    }
  }

  const handleAccept = async (n: Notification) => {
    if (!userProfile?.uid) return
    try {
      // acceptFriendRequest(currentUser, requester)
      await acceptFriendRequest(userProfile.uid, n.fromUserId)
      // mark this notification read
      await markNotificationAsRead(n.id)
      toast({ title: 'Friend added', description: `${n.fromUsername || 'Someone'} is now your friend` })
      // refresh notifications list
      const notes = await getUserNotifications(userProfile.uid, 50)
      setAllNotifications(notes)
    } catch (err) {
      console.error('[v0] Error accepting friend from bell:', err)
      toast({ title: 'Error', description: 'Could not accept friend request' })
    }
  }

  const handleReject = async (n: Notification) => {
    if (!userProfile?.uid) return
    try {
      await rejectFriendRequest(userProfile.uid, n.fromUserId)
      // mark notification as read
      await markNotificationAsRead(n.id)
      // optionally notify original requester
      try {
        await createNotification(n.fromUserId, 'friend_request_rejected', userProfile.uid, userProfile.username)
      } catch (e) {
        console.error('[v0] Error creating rejection notification:', e)
      }
      toast({ title: 'Request rejected', description: `Rejected ${n.fromUsername || 'requester'}` })
      const notes = await getUserNotifications(userProfile.uid, 50)
      setAllNotifications(notes)
    } catch (err) {
      console.error('[v0] Error rejecting friend from bell:', err)
      toast({ title: 'Error', description: 'Could not reject friend request' })
    }
  }

    const handleChallengeAccept = async (n: Notification) => {
      if (!userProfile?.uid) return
      try {
        const challengeId = (n.details as any)?.challengeId
        if (!challengeId) {
          toast({ title: 'Error', description: 'Challenge ID not found' })
          return
        }
      
        const opponentUsername = userProfile.username || ""
        const opponentElo = userProfile.languageRatings?.overall || 400
        const opponentProfilePic = (userProfile as any).profilePicture

        const matchId = await acceptChallenge(
          challengeId,
          userProfile.uid,
          opponentUsername,
          opponentElo,
          opponentProfilePic,
        )
        await markNotificationAsRead(n.id)

        // Store challenge ID (for countdown page to fetch challenge) and redirect to countdown using matchId
        sessionStorage.setItem('currentChallengeId', challengeId)
        toast({ title: 'Challenge accepted!', description: 'Get ready to play...' })
        setBellOpen(false)
        router.push(`/challenge/${matchId}/countdown`)
      } catch (err) {
        console.error('[v0] Error accepting challenge:', err)
        toast({ title: 'Error', description: 'Could not accept challenge' })
      }
    }

    const handleChallengeDecline = async (n: Notification) => {
      if (!userProfile?.uid) return
      try {
        const challengeId = (n.details as any)?.challengeId
        if (!challengeId) {
          toast({ title: 'Error', description: 'Challenge ID not found' })
          return
        }
      
        await declineChallenge(challengeId, userProfile.uid)
        await markNotificationAsRead(n.id)
      
        toast({ title: 'Challenge declined', description: 'Notification sent to challenger' })
        // Refresh notifications
        const notes = await getUserNotifications(userProfile.uid, 50)
        setAllNotifications(notes)
      } catch (err) {
        console.error('[v0] Error declining challenge:', err)
        toast({ title: 'Error', description: 'Could not decline challenge' })
      }
    }

  return (
    <div className="w-full max-w-7xl mx-auto p-4 space-y-6">
      {/* User Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 border-2 border-primary">
              <AvatarImage src={userProfile?.profilePicture} />
              <AvatarFallback className="text-2xl">
                {userProfile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{userProfile?.username}</h1>
              <p className="text-muted-foreground">
                {(() => {
                  const ratings = {
                    HTML: userProfile?.languageRatings?.HTML || 400,
                    CSS: userProfile?.languageRatings?.CSS || 400,
                    JavaScript: userProfile?.languageRatings?.JavaScript || 400,
                  }
                  let highest = "JavaScript"
                  let highestValue = ratings.JavaScript
                  for (const [lang, rating] of Object.entries(ratings)) {
                    if (rating > highestValue) {
                      highestValue = rating
                      highest = lang
                    }
                  }
                  return `Top Rating: ${highest} - ${highestValue}`
                })()}
              </p>
            </div>
            <div className="ml-auto relative">
              <Button variant="ghost" onClick={handleBellClick} aria-label="Notifications">
                <Bell className="h-5 w-5" />
                {unreadNotifications.length > 0 && (
                  <span className="ml-2">
                    <Badge>{unreadNotifications.length}</Badge>
                  </span>
                )}
              </Button>

              {/* Notification dropdown positioned relative to the bell */}
              {bellOpen && (
                <div className="absolute top-full right-0 mt-2 w-80 bg-popover border rounded-md shadow-lg z-50">
                  <div className="flex items-center justify-between p-3 border-b">
                    <h3 className="font-medium">Notifications</h3>
                    <div>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        // Mark all current unread as read and delete them from the UI
                        try {
                          // Mark as read
                          for (const u of unreadNotifications) {
                            await markNotificationAsRead(u.id)
                          }
                          // Also delete all notifications from UI (both unread and read in the dropdown)
                          for (const n of allNotifications) {
                            try {
                              await deleteNotification(n.id)
                            } catch (e) {
                              console.error('[v0] Error deleting notification:', e)
                            }
                          }
                          // Update UI state
                          setUnreadNotifications([])
                          setAllNotifications([])
                          setBellOpen(false)
                          toast({ title: 'Notifications cleared' })
                        } catch (e) {
                          console.error('[v0] Error clearing notifications from bell:', e)
                          toast({ title: 'Error', description: 'Could not clear notifications' })
                        }
                      }}>Clear</Button>
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {allNotifications.length === 0 ? (
                      <div className="p-4 text-sm text-muted-foreground">No notifications</div>
                    ) : (
                      allNotifications.map((n) => (
                        <div key={n.id} className={`p-3 border-b ${n.read ? 'bg-transparent' : 'bg-muted/50'}`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium">
                                  {n.type === 'friend_request_received' ? `${n.fromUsername || 'Someone'} sent you a friend request`
                                  : n.type === 'friend_request_accepted' ? `${n.fromUsername || 'Someone'} accepted your friend request`
                                  : n.type === 'friend_request_rejected' ? `${n.fromUsername || 'Someone'} rejected your friend request`
                                  : n.type === 'challenge_received' ? `${n.fromUsername || 'Someone'} is challenging you to a ${(n.details as any)?.language} ${(n.details as any)?.mode} match`
                                  : n.type === 'challenge_accepted' ? `${n.fromUsername || 'Someone'} accepted your challenge!`
                                  : n.type === 'challenge_declined' ? `${n.fromUsername || 'Someone'} declined your challenge`
                                  : 'New notification'}
                                </p>
                              <p className="text-xs text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                            {!n.read && n.type === 'friend_request_received' && (
                              <div className="flex items-center gap-2 ml-2">
                                <Button size="sm" onClick={() => handleAccept(n)}>✓</Button>
                                <Button size="sm" variant="ghost" onClick={() => handleReject(n)}>✕</Button>
                              </div>
                            )}
                              {!n.read && n.type === 'challenge_received' && (
                                <div className="flex items-center gap-2 ml-2">
                                  <Button size="sm" onClick={() => handleChallengeAccept(n)}>✓</Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleChallengeDecline(n)}>✕</Button>
                                </div>
                              )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Games */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentGames.length > 0 ? (
              <div className="space-y-1">
                {recentGames.map((game) => (
                  <GameHistoryRow key={game.id} game={game} currentRating={(userProfile as any)?.languageRatings?.[game.language] ?? 400} matchId={game.id} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[200px] space-y-4">
                <Trophy className="h-12 w-12 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-muted-foreground">No games yet</p>
                  <a href="/dashboard/play" className="text-primary hover:underline">Start a game</a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Friends Online & Question of the Day */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Friends Online
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[160px]">
                <div className="space-y-4">
                  {friends.filter(friend => friendStatuses[friend.friendId]?.status === "online" || friendStatuses[friend.friendId]?.status === "in-game").length > 0 ? (
                    friends
                    .filter(friend => friendStatuses[friend.friendId]?.status === "online" || friendStatuses[friend.friendId]?.status === "in-game")
                    .map((friend) => {
                      const status = friendStatuses[friend.friendId]?.status || "offline"
                      return (
                        <div 
                          key={friend.id} 
                          className="flex items-center justify-between cursor-pointer hover:bg-muted/50 p-2 rounded transition-colors"
                          onClick={() => router.push(`/dashboard/profile/${friend.friendUsername}`)}
                        >
                        <div className="flex items-center gap-3 flex-1">
                          <div className="relative">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={friend.friendProfilePic} />
                              <AvatarFallback>{friend.friendUsername[0]}</AvatarFallback>
                            </Avatar>
                            <div className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full ring-2 ring-background ${
                              status === "in-game" 
                                ? "bg-yellow-500" 
                                : status === "online" 
                                  ? "bg-green-500" 
                                  : "bg-muted"
                            }`} />
                          </div>
                          <div>
                            <p className="font-medium">{friend.friendUsername}</p>
                            <p className="text-xs text-muted-foreground">
                              {status === "in-game" 
                                ? "In Game" 
                                : status === "online" 
                                  ? "Online" 
                                  : "Offline"}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium">{friend.friendElo}</span>
                      </div>
                    )
                  })
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[100px] space-y-4">
                      <Users className="h-12 w-12 text-muted-foreground/50" />
                      <div className="text-center">
                        <p className="text-muted-foreground">No friends online</p>
                        <a href="/dashboard/friends" className="text-primary hover:underline">Add more friends</a>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Alert>
            <Calendar className="h-4 w-4" />
            <AlertTitle>Question of the Day</AlertTitle>
            <AlertDescription>
              Coming soon! Daily coding challenges to test your skills.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  )
}
