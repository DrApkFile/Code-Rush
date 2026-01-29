# Firestore Indexes to Create - Quick Reference

## 3 Required Indexes for Challenge System

### 1. Challenge Throttle Check (CRITICAL)
**Purpose:** Enforce 5 challenges per 2-hour limit
```
Collection: challenges
Field 1: creatorId (Ascending)
Field 2: createdAt (Descending)
```
**Used by:** `checkChallengeThrottle()` to query recent challenges

---

### 2. Challenge Lookup by Match ID
**Purpose:** Load challenge details from match ID
```
Collection: challenges
Field: matchId (Ascending)
```
**Used by:** `getChallengeByMatchId()` in countdown page

---

### 3. Match History Query
**Purpose:** Retrieve player's match history
```
Collection: matches
Field 1: player1.uid (Ascending)
Field 2: createdAt (Descending)
```
**Used by:** Player profile/stats queries

---

## Updated Challenges Collection Rules

### Key Changes:
✅ Added `creatorElo` to challenge creation (required)
✅ Added `expiresAt` to challenge creation (required for 2-min timeout)
✅ Added `notificationId` to update fields
✅ Support for shareable public challenges (`!opponentId`)
✅ Support for throttle check queries

### Required Fields When Creating Challenge:
```
{
  "creatorId": uid,
  "creatorUsername": string,
  "creatorElo": number,          // NEW - for ratings
  "mode": "3-min" | "5-min" | "survival",
  "language": "HTML" | "CSS" | "JavaScript",
  "questionFormat": "MCQ" | "Fill in the Blank" | "Fix the Code" | "all",
  "isRated": boolean,
  "status": "pending",
  "createdAt": timestamp,
  "expiresAt": timestamp         // NEW - for 2-minute expiry
}
```

---

## How to Create Indexes (Firebase Console)

1. Go to Firebase Console → Firestore Database → Indexes tab
2. Click "Create Index"
3. For each index above:
   - Select **Collection ID** (e.g., "challenges")
   - Add fields in order with Ascending/Descending
   - Click **Create Index**
4. Wait 5-10 minutes for index to build

---

## How to Create Indexes (Firebase CLI)

After updating `firestore.indexes.json`:
```bash
firebase deploy --only firestore:indexes
```

---

## Status After Setup:
- ✅ Throttle queries will be fast (< 100ms)
- ✅ Challenge lookups by matchId optimized
- ✅ Match history queries optimized
- ✅ All rules support complete challenge lifecycle
