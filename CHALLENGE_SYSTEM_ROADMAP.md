# Friend Challenge System - Implementation Roadmap

## Overview
This document outlines the implementation of a real-time friend challenge system with notifications, throttling, waiting rooms, and preloaded questions.

## Phase 1: Challenge Form & Online Status (CURRENT)
### Changes:
- Remove opponent selection dropdown from `challenge-setup.tsx` (already selecting friend from friend list)
- Accept `friendId` as prop to pre-populate
- Disable challenge button if friend is offline or in-game
- Add `createFriendChallenge()` helper to track attempts & throttle

### Files to modify:
- `components/dashboard/challenge-setup.tsx` - remove dropdown, add friendId prop
- `app/dashboard/friends/page.tsx` - add challenge button with online check
- `app/dashboard/profile/[userId]/page.tsx` - add challenge button with online check
- `lib/friend-challenges.ts` - add throttling & notification creation
- `firestore.rules` - add rules for challenge throttling collection

---

## Phase 2: Waiting Room & Notifications
### Features:
- When user sends challenge → create notification on friend's device
- Notification shows: "Username is challenging you to a [Language] [TimeControl] match"
- Accept/Decline buttons in notification
- Sender sees "Waiting for friend to accept..." screen
- Auto-redirect if no response after 1 minute

### Files to create:
- `app/dashboard/challenge/waiting/page.tsx` - waiting room UI
- `lib/challenge-notifications.ts` - challenge notification helpers

### Files to modify:
- `lib/friend-challenges.ts` - add listener for challenge acceptance
- `lib/friends-queries.ts` - extend notification types

---

## Phase 3: Game Startup & Preloading
### Features:
- When both accept → show 3-2-1 countdown
- Fetch & preload questions DURING countdown (up to 50% of total)
- Start game with preloaded questions
- Async-load remaining questions during gameplay
- Handle network delays gracefully

### Files to create:
- `app/challenge/[challengeId]/countdown/page.tsx` - countdown screen
- `lib/question-preloader.ts` - preloading logic

### Files to modify:
- `app/challenge/[challengeId]/page.tsx` - game start page

---

## Phase 4: Throttling & Rate Limiting
### Features:
- Track challenge attempts per user (sent challenges in last 2 hours)
- After 5 sent challenges → show "Too many challenges, try again in 2hrs"
- Challenge expires if not accepted within 1 minute
- Rate limit resets after 2 hours

### Database structure:
```
/challenges_attempts/{userId}/
  - sentAt: [timestamps...]
  - count: number
  - resetAt: timestamp
```

### Files to modify:
- `lib/friend-challenges.ts` - add attempt tracking
- `firestore.rules` - add write rules for attempts tracking

---

## Phase 5: Decline & Reconnect Logic
### Features:
- When friend declines → sender returns to friends page
- Show "Challenge declined" toast
- Can send another challenge (respects 5-try limit)
- Waiting room timeout (1 min) → return to friends page

---

## Notifications Schema
```
/notifications/{notificationId}/
  - type: "challenge_received" | "challenge_accepted" | "challenge_declined" | "challenge_expired"
  - userId: recipient
  - fromUserId: challenger
  - fromUsername: challenger username
  - challengeId: challenge doc id
  - challengeDetails: { mode, language, timeControl }
  - read: boolean
  - createdAt: timestamp
```

---

## Challenges Collection Schema Update
```
/challenges/{challengeId}/
  - creatorId, creatorUsername, creatorElo, creatorProfilePic
  - opponentId, opponentUsername, opponentElo, opponentProfilePic
  - mode: "3-min" | "5-min" | "survival"
  - language: "HTML" | "CSS" | "JavaScript"
  - questionFormat: "MCQ" | "Fill in the Blank" | "Fix the Code" | "all"
  - isRated: boolean
  - status: "pending" | "accepted" | "in_progress" | "completed" | "declined" | "expired"
  - matchId: match doc id
  - createdAt, expiresAt, acceptedAt, declinedAt, completedAt
  - notificationId: notification doc id (for cleanup)
```

---

## Implementation Priority
1. ✅ Phase 1: Form simplification + online status check
2. ⏳ Phase 2: Waiting room + notifications
3. ⏳ Phase 3: Game startup + preloading
4. ⏳ Phase 4: Throttling + rate limiting
5. ⏳ Phase 5: Decline + reconnect

---

## Key Helpers to Implement

### `createFriendChallenge(creatorId, friendId, settings)`
- Check friend is online
- Check attempt count (throttle)
- Create challenge doc
- Create notification on friend's device
- Return { challengeId, waiting: true }

### `acceptChallenge(challengeId, userId)`
- Update challenge status to "accepted"
- Create notification for creator
- Start countdown/preloading

### `declineChallenge(challengeId, userId, reason?)`
- Update challenge status to "declined"
- Create notification for creator
- Mark notification as read

### `listenToChallengeStatus(challengeId, callback)`
- Real-time listener on challenge doc
- Trigger actions on acceptance/decline/expiry

### `preloadQuestions(language, format, count)`
- Async fetch questions
- Return array of preloaded questions
- Support partial loading (up to 50%)

---

## UI Flow

### From Friends List:
```
Friends List
  → Click "Challenge" button (only if online)
  → Challenge Setup Form (no opponent dropdown)
  → Click "Play"
  → Waiting Room
  → Friend receives notification
  → Friend accepts/declines
  → If accepted: 3-2-1 Countdown → Game
  → If declined: Back to Friends List
```

### From Profile:
```
User Profile
  → Click "Challenge" button (only if online)
  → Same as above...
```

---

## Testing Checklist
- [ ] Challenge form removes opponent dropdown
- [ ] Challenge button disabled when friend offline/in-game
- [ ] Challenge sent creates notification on friend's device
- [ ] Waiting room displays for 1 min with auto-return
- [ ] Friend accepts → both sent to countdown
- [ ] Countdown shows 3-2-1
- [ ] Questions preload during countdown
- [ ] Game starts with preloaded questions
- [ ] Remaining questions load async during gameplay
- [ ] 5 challenges in 2hrs → throttle message
- [ ] Friend decline → sender back to friends
- [ ] 1 min timeout in waiting room → auto-return

