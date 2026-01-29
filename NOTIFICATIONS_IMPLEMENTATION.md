# Notifications & Friend Request System Implementation

## Overview
Implemented a complete real-time notification system for friend requests with Firestore rules, backend listeners, and UI toast notifications.

---

## 📋 What Was Implemented

### 1. **Notifications Collection** (Firestore)
- New collection: `/notifications/{notificationId}`
- Fields:
  - `userId` (string) - recipient of the notification
  - `type` (string) - notification type
  - `fromUserId` (string) - who triggered the notification
  - `fromUsername` (string) - sender's username for display
  - `read` (boolean) - whether notification was read
  - `createdAt` (number) - timestamp

### 2. **Updated Firestore Rules**
✅ **Notifications Collection**
- Users can only read their own notifications
- Anyone can create notifications (with validation)
- Users can update the `read` status of their notifications
- Users can delete their own notifications

✅ **Friends Collection** (Enhanced)
- Users can read all friend documents
- Create allows both sides (userId or friendId) of friendship
- Update only status and acceptedAt fields
- Delete allows both sides to remove

✅ **User-Status Collection** (Fixed)
- Users can read all status documents
- Users can create/update only their own status

---

## 🔧 Backend Functions Added

### In `lib/friends-queries.ts`:

#### **Notification Type**
```typescript
export interface Notification {
  id: string
  userId: string
  type: "friend_request_received" | "friend_request_accepted" | "friend_request_rejected"
  fromUserId: string
  fromUsername?: string
  read: boolean
  createdAt: number
}
```

#### **Core Functions**

1. **`createNotification(userId, type, fromUserId, fromUsername)`**
   - Creates a new notification document
   - Called automatically when:
     - Friend request sent
     - Friend request accepted

2. **`listenToUnreadNotifications(userId, callback)`**
   - Real-time listener for user's unread notifications
   - Returns array of unread Notification objects
   - Automatically triggered when new notifications arrive

3. **`markNotificationAsRead(notificationId)`**
   - Updates notification's `read` status to true
   - Called after showing toast to user

4. **`deleteNotification(notificationId)`**
   - Removes a notification (optional)

5. **`listenToIncomingFriendRequests(userId, callback)`**
   - Real-time listener for pending incoming friend requests
   - Returns requests where current user is `friendId`
   - Can be used for request badge count

#### **Updated Functions**

1. **`sendFriendRequest(userId, friendId)`**
   - ✅ Now creates a notification for the recipient
   - Fetches sender's username
   - Includes `friendUsername` in friend document

2. **`acceptFriendRequest(userId, friendId)`**
   - ✅ Now creates a notification for the original requester
   - Tells them their request was accepted

---

## 🎨 Frontend Implementation

### **FriendsSection Component** (`components/dashboard/friends-section.tsx`)

Added global notification listener:

```typescript
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
      markNotificationAsRead(notification.id)
    })

    setNotifications(newNotifications)
  })

  return () => unsubscribe()
}, [userProfile?.uid, toast])
```

---

## 🔐 Updated Firestore Rules

```plaintext
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... existing rules ...

    // Friends collection
    match /friends/{friendId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && 
        (request.resource.data.userId == request.auth.uid || 
         request.resource.data.friendId == request.auth.uid) &&
        request.resource.data.keys().hasAll(['userId', 'friendId', 'status', 'createdAt']);
      allow update: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         resource.data.friendId == request.auth.uid) &&
        request.resource.data.diff(resource.data).affectedKeys()
          .hasOnly(['status', 'acceptedAt']);
      allow delete: if isAuthenticated() && 
        (resource.data.userId == request.auth.uid || 
         resource.data.friendId == request.auth.uid);
    }

    // User status collection (for online/offline status)
    match /user-status/{userId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated() && isOwner(userId);
      allow update: if isAuthenticated() && isOwner(userId);
    }

    // Notifications collection
    match /notifications/{notificationId} {
      // Allow users to read their own notifications
      allow read: if isAuthenticated() && resource.data.userId == request.auth.uid;
      
      // Allow creating notifications
      allow create: if isAuthenticated() && 
        request.resource.data.keys().hasAll(['userId', 'type', 'fromUserId', 'read', 'createdAt']) &&
        request.resource.data.type in ['friend_request_received', 'friend_request_accepted', 'friend_request_rejected'];
      
      // Allow users to update read status of their own notifications
      allow update: if isAuthenticated() && 
        resource.data.userId == request.auth.uid &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['read']);
      
      // Allow users to delete their own notifications
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## 🚀 How It Works - Flow Diagram

```
User A sends friend request to User B
    ↓
sendFriendRequest(userA.id, userB.id)
    ↓
1. Creates document in /friends collection
   - userId: userA.id
   - friendId: userB.id
   - friendUsername: "UserA"
   - status: "pending"
    ↓
2. Creates notification for User B
   - userId: userB.id
   - type: "friend_request_received"
   - fromUserId: userA.id
   - fromUsername: "UserA"
    ↓
Real-time Listeners Trigger
    ↓
FriendsSection on User B's dashboard listens to notifications
    ↓
listenToUnreadNotifications fires
    ↓
Toast shows: "Friend Request - UserA sent you a friend request"
    ↓
markNotificationAsRead(notificationId) is called
    ↓
Notification marked as read in Firestore

====================================

User B accepts friend request
    ↓
acceptFriendRequest(userB.id, userA.id)
    ↓
1. Updates /friends document
   - status: "accepted"
   - acceptedAt: Date.now()
    ↓
2. Creates notification for User A
   - userId: userA.id
   - type: "friend_request_accepted"
   - fromUserId: userB.id
   - fromUsername: "UserB"
    ↓
User A sees toast: "Friend Request Accepted - UserB accepted your friend request"
```

---

## 🐛 Permission Error Fix

**Previous Error:**
```
FirebaseError: [code=permission-denied]: Missing or insufficient permissions.
```

**Causes:**
1. Firestore rules didn't allow reading friend documents
2. Notifications collection didn't exist with proper rules
3. User-status rules were too restrictive

**Solution:**
- ✅ Added `allow read: if isAuthenticated()` to friends collection
- ✅ Created notifications collection with proper read/write rules
- ✅ Fixed user-status rules to allow read for all authenticated users
- ✅ Each user can only read/modify their own notifications

---

## 📦 Files Modified

1. **`firestore.rules`**
   - Added notifications collection rules
   - Enhanced friends collection rules
   - Fixed user-status collection rules

2. **`lib/friends-queries.ts`**
   - Added Notification interface
   - Added 5 new notification functions
   - Updated sendFriendRequest to create notifications
   - Updated acceptFriendRequest to create notifications

3. **`components/dashboard/friends-section.tsx`**
   - Added useToast hook import
   - Added notification listener hook
   - Added automatic toast notifications on friend requests
   - Added notification state management

---

## ✅ Testing Checklist

- [ ] Send friend request → User receives toast notification
- [ ] Accept friend request → Original requester receives toast notification
- [ ] Reload page → No duplicate notifications (because they're marked as read)
- [ ] Check Firestore → notifications collection has documents with correct data
- [ ] Reject friend request → Future: Add rejection notification
- [ ] View Notifications → Implement notification panel to view history

---

## 🔮 Future Enhancements

1. **Notification Panel** - Show all notifications (read + unread)
2. **Badge Count** - Show unread notification count on friends icon
3. **Sound/Desktop Notifications** - Use browser notifications API
4. **Notification Settings** - Let users disable certain notification types
5. **Rejection Notification** - Notify users when request is rejected
6. **Bulk Operations** - Mark all as read, delete all, etc.

