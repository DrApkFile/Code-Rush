"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import {
  listenToFriends,
  getUsersByIds,
  sendFriendRequest,
  removeFriend,
  type Friend,
  listenToFriendStatus,
  type UserStatus,
  searchUsers,
  listenToUnreadNotifications,
  markNotificationAsRead,
  type Notification,
} from "@/lib/friends-queries"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Search, Loader2 } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useDebouncedCallback } from "use-debounce"
import { useToast } from "@/components/ui/use-toast"

export default function FriendsSection() {
  const { userProfile } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [friends, setFriends] = useState<Friend[]>([])
  const [friendStatuses, setFriendStatuses] = useState<Record<string, UserStatus>>({})
  const [friendRatings, setFriendRatings] = useState<Record<string, number>>({})
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [noResults, setNoResults] = useState(false)
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])

  // Listen to friends list
  useEffect(() => {
    if (!userProfile?.uid) return

    const unsubscribe = listenToFriends(userProfile.uid, (friendsList) => {
      setFriends(friendsList)
    })

    return () => unsubscribe()
  }, [userProfile?.uid])

  // Listen to each friend's status
  useEffect(() => {
    if (friends.length === 0) return

    const unsubscribers: Array<() => void> = []

    friends.forEach((friend) => {
      const unsubscribe = listenToFriendStatus(friend.friendId, (status) => {
        setFriendStatuses((prev) => ({
          ...prev,
          [friend.friendId]: status || { uid: friend.friendId, status: "offline", lastSeen: Date.now() },
        }))
      })
      unsubscribers.push(unsubscribe)
    })

    return () => {
      unsubscribers.forEach((unsub) => unsub())
    }
  }, [friends])

  // Fetch canonical ratings for current friends from `users` collection
  useEffect(() => {
    let mounted = true
    const friendIds = friends.map((f) => f.friendId)
    if (friendIds.length === 0) {
      setFriendRatings({})
      return
    }

    ;(async () => {
      try {
        const mapping = await getUsersByIds(friendIds)
        if (!mounted) return
        // Reduce mapping to simple uid -> elo number
        const reduced: Record<string, number> = {}
        for (const id of Object.keys(mapping)) {
          reduced[id] = mapping[id].eloRating ?? 400
        }
        setFriendRatings(reduced)
      } catch (e) {
        console.error('[v0] Error fetching friend ratings:', e)
      }
    })()

    return () => {
      mounted = false
    }
  }, [friends])

  // Listen to unread notifications
  useEffect(() => {
    if (!userProfile?.uid) return

    const unsubscribe = listenToUnreadNotifications(userProfile.uid, (newNotifications) => {
      // Show toast for new notifications
      newNotifications.forEach((notification) => {
        if (notification.type === "friend_request_received") {
          toast({
            title: "Friend Request",
            description: `${notification.fromUsername || "Someone"} sent you a friend request`,
          })
        } else if (notification.type === "friend_request_accepted") {
          toast({
            title: "Friend Request Accepted",
            description: `${notification.fromUsername || "Someone"} accepted your friend request`,
          })
        }

        // Mark as read
        markNotificationAsRead(notification.id).catch((error) =>
          console.error("[Notifications] Error marking as read:", error),
        )
      })

      setNotifications(newNotifications)
    })

    return () => unsubscribe()
  }, [userProfile?.uid, toast])

  // Debounced search for suggestions ONLY
  const debouncedSearch = useDebouncedCallback(async (value: string) => {
    if (!value.trim() || !userProfile?.uid) {
      console.log("[Search] Empty query, clearing suggestions")
      setSuggestions([])
      return
    }

    console.log("[Search] Debounced search triggered for:", value)
    setLoading(true)
    try {
      const results = await searchUsers(value, [userProfile.uid, ...friends.map((f) => f.friendId)])
      console.log("[Search] Suggestions received:", results)
      setSuggestions(results)
    } catch (error) {
      console.error("[Search] Suggestion error:", error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, 300)

  // Handle manual search - ONLY triggered by search button
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("[Search] Manual search button clicked for:", searchQuery)
    
    if (!searchQuery.trim() || !userProfile?.uid) {
      console.log("[Search] Empty search query, skipping")
      return
    }

    setLoading(true)
    setNoResults(false)
    try {
      console.log("[Search] Executing manual search for:", searchQuery)
      const results = await searchUsers(searchQuery, [userProfile.uid, ...friends.map((f) => f.friendId)])
      console.log("[Search] Manual search results:", results)
      setSearchResults(results)
      setNoResults(results.length === 0)
      setSuggestions([])
      setOpen(false)
    } catch (error) {
      console.error("[Search] Manual search error:", error)
      setSearchResults([])
      setNoResults(true)
    } finally {
      setLoading(false)
    }
  }

  // Handle suggestion selection
  const handleSelect = (user: any) => {
    console.log("[Search] Suggestion selected:", user.username)
    setSelectedUser(user)
    setSearchQuery(user.username)
    setOpen(false)
    // Immediately show this user in results
    setSearchResults([user])
  }

  // Add friend
  const handleAddFriend = async (friendId: string) => {
    if (!userProfile?.uid) return
    try {
      await sendFriendRequest(userProfile.uid, friendId)
      setSearchResults((prev) => prev.filter((u) => u.uid !== friendId))
    } catch (error) {
      console.error("[v0] Error adding friend:", error)
    }
  }

  // Remove friend
  const handleRemoveFriend = async (friendshipId: string) => {
    try {
      await removeFriend(friendshipId)
    } catch (error) {
      console.error("[v0] Error removing friend:", error)
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Friends</h2>
        <p className="text-muted-foreground">Manage your friends and challenge them</p>
      </div>

      {/* Search Bar with Suggestions */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-2 relative">
            <div className="flex-1 relative">
              <Input
                placeholder="Search users by username..."
                value={searchQuery}
                onChange={(e) => {
                  const value = e.target.value
                  console.log("[Input] Text changed:", value)
                  setSearchQuery(value)
                  debouncedSearch(value) // Only for suggestions
                  if (value) setOpen(true)
                }}
                onFocus={() => searchQuery && setOpen(true)}
                className="w-full"
              />
              {/* Suggestions Dropdown */}
              {open && (suggestions.length > 0 || loading) && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                  {loading && (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="ml-2 text-sm text-muted-foreground">Searching...</span>
                    </div>
                  )}
                  {!loading && suggestions.length === 0 && (
                    <div className="p-4 text-sm text-muted-foreground text-center">
                      No suggestions
                    </div>
                  )}
                  {suggestions.map((user) => (
                    <button
                      key={user.uid}
                      type="button"
                      onClick={() => handleSelect(user)}
                      className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-100 transition-colors border-b last:border-b-0"
                    >
                      {user.profilePicture ? (
                        <Image
                          src={user.profilePicture}
                          alt={user.username}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                          {user.username[0].toUpperCase()}
                        </div>
                      )}
                      <div className="text-left flex-1">
                        <p className="text-sm font-medium">{user.username}</p>
                        <p className="text-xs text-muted-foreground">Rating: {user.eloRating}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
        </form>

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">Search Results:</p>
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div 
                  key={user.uid} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
                  onClick={() => router.push(`/dashboard/profile/${user.username}`)}
                >
                  <div className="flex items-center gap-3 flex-1">
                    {user.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt={user.username}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        {user.username[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="font-medium">{user.username}</p>
                      <p className="text-xs text-muted-foreground">Rating: {user.eloRating}</p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation()
                      handleAddFriend(user.uid)
                    }}
                  >
                    Add Friend
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Results Message */}
        {noResults && searchQuery && !loading && (
          <div className="mt-4 text-center p-4 bg-muted rounded-lg">
            <p className="text-muted-foreground">No users found matching "{searchQuery}"</p>
          </div>
        )}
      </Card>

      {/* Friends List */}
      {friends.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground mb-4">No friends yet. Search and add someone!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {friends.map((friend) => {
            const status = friendStatuses[friend.friendId]
            return (
              <Card key={friend.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-3 flex-1 cursor-pointer"
                    onClick={() => router.push(`/dashboard/profile/${friend.friendUsername}`)}
                  >
                    {friend.friendProfilePic && (
                      <img
                        src={friend.friendProfilePic || "/placeholder.svg"}
                        alt={friend.friendUsername}
                        className="w-10 h-10 rounded-full"
                      />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{friend.friendUsername}</p>
                        <div
                          className={`w-2 h-2 rounded-full ${getStatusColor(status?.status)}`}
                          title={getStatusText(status?.status)}
                        />
                      </div>
                      <p className="text-sm text-muted-foreground">Rating: {friendRatings[friend.friendId] ?? friend.friendElo ?? 400}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={`/dashboard/challenge?friendId=${friend.friendId}`}>
                        <Button size="sm" disabled={status?.status !== "online"}>
                          {status?.status === "in-game" ? "In Game" : status?.status === "offline" ? "Offline" : "Challenge"}
                        </Button>
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => handleRemoveFriend(friend.id)}>
                      Remove
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
