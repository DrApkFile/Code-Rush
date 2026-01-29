# Firestore Setup Guide - Solo Match Persistence

## Overview
This document outlines the Firestore configuration required for the new **solo match canonical storage** system. All final solo game records are now persisted in the `solo_matches` collection with full match data (questions, answers, rating snapshots).

---

## Security Rules Changes

### Updated Collection: `solo_matches`
The `solo_matches` collection has been enhanced to enforce immutability and stricter validation:

**Key Changes:**
- **Read Access**: Authenticated users can read:
  - Any completed solo match (public history)
  - Their own solo matches
- **Create Access**: Authenticated users can create a solo match if:
  - Request user UID matches `player1.uid` (owner verification)
  - Document has required fields: `player1`, `language`, `mode`, `status`, `createdAt`, `questions`, `answers`, `ratingBefore`, `ratingAfter`, `ratingChange`
  - `language` is one of: `HTML`, `CSS`, `JavaScript`
  - `mode` is one of: `solo`, `3min`, `5min`, `survival`
  - `status` must be `completed` (only final/completed matches are stored)
- **Update/Delete**: Disabled (immutable collection)

**Required Fields in Solo Match Document:**
```typescript
{
  player1: {
    uid: string              // User ID
    username: string         // Username at time of match
    profilePicture?: string  // Profile pic at time of match
    languageRatings: object  // Snapshot of user's ratings at match time
    score: number           // Final score
    correctAnswers: number  // Correct count
    wrongAnswers: number    // Wrong count
    answers: (number | null)[]  // User's answer indices per question
  },
  language: "HTML" | "CSS" | "JavaScript"
  mode: "solo" | "3min" | "5min" | "survival"  // Game mode at time of match
  gameMode?: string         // Original mode for compatibility
  questions: Array<{       // Full question data with user's answers
    id: string
    content: string
    options: string[]
    explanation?: string
    difficulty?: string
    correctAnswerIndex: number
    userAnswerIndex: number | null  // User's selected answer
    timeSpent: number       // Seconds spent on this question
    correct: boolean        // Whether user answered correctly
  }>
  sessionQuestions: Array<{ // Per-question summary
    questionId: string
    correct: boolean
    timeSpent: number
  }>
  answers: (number | null)[]  // Duplicated for compatibility
  status: "completed"      // Always completed
  isRated: boolean         // Whether match affects rating
  createdAt: number        // Match creation timestamp
  startedAt: number        // Match start timestamp
  endedAt: number          // Match end timestamp
  winner: string           // Player UID (solo: always player1.uid)
  results: {
    player1: {
      score: number
      accuracy: number
      correctAnswers: number
    }
  }
  ratingBefore: number     // Player's rating before match
  ratingAfter: number      // Player's rating after match
  ratingChange: number     // Delta (ratingAfter - ratingBefore)
}
```

---

## Firestore Indexes

All required indexes are configured in `firestore.indexes.json`. Here's what's deployed:

### Primary Indexes for Solo Matches

#### Index 1: User's Solo Matches (Reverse Chronological)
```
Collection: solo_matches
Fields:
  - player1.uid (Ascending)
  - createdAt (Descending)
Purpose: getUserSoloMatches() query to list user's matches newest first
```

### Existing Indexes (Unchanged)

#### Index 2: Game Sessions (User History)
```
Collection: game_sessions
Fields:
  - userId (Ascending)
  - startTime (Descending)
Purpose: getUserGameHistory() query (still used for backward compatibility)
```

#### Index 3-4: Multiplayer Matches
```
Collection: matches
Fields:
  - player1.uid (Ascending)
  - createdAt (Descending)
  
Collection: matches
Fields:
  - player2.uid (Ascending)
  - createdAt (Descending)
Purpose: Query matches for both player 1 and player 2
```

---

## Deployment Steps

### 1. Update Security Rules
The new rules are in `firestore.rules`. Deploy with:
```bash
firebase deploy --only firestore:rules
```

### 2. Create/Update Indexes
Indexes are defined in `firestore.indexes.json`. Deploy with:
```bash
firebase deploy --only firestore:indexes
```

**Note:** If you're adding the `solo_matches` index for the first time, Firestore will take **a few minutes to build** the index. You can monitor progress in the Firebase Console under **Firestore > Indexes**.

### 3. Verify Deployment
After deployment, verify:
- ✅ Rules are enforced (attempts to update solo_matches should fail with permission denied)
- ✅ Indexes are building (check Firebase Console)
- ✅ New solo matches are being created on game end
- ✅ History queries load from `solo_matches` (verify in browser DevTools)

---

## Data Migration Notes

### Backward Compatibility
- **`game_sessions`** collection continues to exist for:
  - In-progress sessions (live game state)
  - Historical compatibility
  - Session resumption after refresh
  
- **`solo_matches`** is now the canonical source for:
  - Completed solo game records
  - History listings (via `getUserSoloMatches`)
  - Review/replay pages (full question and timing data)

### No Manual Migration Required
- Old matches in `game_sessions` remain unchanged
- New matches are created in `solo_matches` only
- Review pages automatically fall back to `game_sessions` if `solo_matches` record not found

---

## Query Examples

### List User's Recent Solo Matches
```typescript
import { getUserSoloMatches } from "@/lib/multiplayer-queries"

const recentMatches = await getUserSoloMatches(userId, limit = 20)
// Returns matches ordered by createdAt (newest first)
```

### Fetch a Specific Solo Match for Review
```typescript
import { getSoloMatch } from "@/lib/multiplayer-queries"

const match = await getSoloMatch(matchId)
// Contains full question data, answers, rating snapshots
```

---

## Firestore Security Best Practices Applied

✅ **Authentication Check**: All operations require `request.auth != null`  
✅ **Ownership Verification**: User can only create matches with their own UID  
✅ **Immutability**: Solo matches cannot be updated (prevents tampering)  
✅ **Field Validation**: Strict checks on language, mode, and status values  
✅ **Public History**: Completed matches are readable by all authenticated users  
✅ **Privacy**: In-progress matches are hidden from other users  

---

## Troubleshooting

### Index Not Found / Query Failing
- **Symptom**: "Index not found" error when querying solo_matches
- **Solution**: Check Firebase Console > Firestore > Indexes. Wait for index to finish building.
- **Timeline**: Usually takes 5-15 minutes

### Permission Denied on Create
- **Symptom**: "Missing or insufficient permissions" when saving a match
- **Cause**: `player1.uid` doesn't match authenticated user or document missing required fields
- **Solution**: Verify `createSoloMatch` passes all required fields and user is authenticated

### History Not Showing in UI
- **Symptom**: Recent games list appears empty or loads slowly
- **Cause**: Still querying `game_sessions` instead of `solo_matches`
- **Solution**: Verify components are using `getUserSoloMatches` (already updated in this iteration)

---

## Related Files

- `firestore.rules` — Security rules (this guide references them)
- `firestore.indexes.json` — Index configuration
- `lib/multiplayer-queries.ts` — Helper functions for solo match CRUD
- `app/dashboard/play/[mode]/game/page.tsx` — Where `createSoloMatch` is called at game end
- `app/dashboard/match/[matchId]/page.tsx` — Owner review page (uses `getSoloMatch`)
- `app/dashboard/profile/[userId]/match/[matchId]/page.tsx` — Spectator review page (uses `getSoloMatch`)

