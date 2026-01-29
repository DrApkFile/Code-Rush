# Required Firestore Indexes & Rules Update Summary

## What Indexes You Need to Create

Based on the new `solo_matches` canonical collection and updated queries, here's what must be deployed:

### Index 1: Solo Matches by Player (REQUIRED)
**Collection:** `solo_matches`  
**Fields:**
- `player1.uid` (Ascending)
- `createdAt` (Descending)

**Purpose:** `getUserSoloMatches()` queries to list user's matches newest first  
**Status:** ✅ Already configured in `firestore.indexes.json`

---

### Index 2: Game Sessions (Already Exists)
**Collection:** `game_sessions`  
**Fields:**
- `userId` (Ascending)
- `startTime` (Descending)

**Purpose:** `getUserGameHistory()` queries (kept for backward compatibility)  
**Status:** ✅ Already exists in Firestore

---

### Index 3-4: Multiplayer Matches (Already Exist)
**Collection:** `matches`  
**Fields for Index 1:**
- `player1.uid` (Ascending)
- `createdAt` (Descending)

**Fields for Index 2:**
- `player2.uid` (Ascending)
- `createdAt` (Descending)

**Purpose:** Query matches by each player  
**Status:** ✅ Already exists in Firestore

---

## Firestore Rules Changes

### Updated `solo_matches` Collection Rules

```firestore
// Solo matches collection - canonical final match records for solo games
// These are immutable once created, containing full question data, answers, and rating snapshots
match /solo_matches/{matchId} {
  // Allow reading any completed solo match (public history view) OR own matches
  allow read: if isAuthenticated() && (
    resource.data.status == 'completed' ||
    resource.data.player1.uid == request.auth.uid
  );
  
  // Allow creating a new solo match record at game end
  // Must have: player1 with uid/username/languageRatings snapshot, language, mode, status, questions, answers,
  // ratingBefore, ratingAfter, ratingChange, timestamps
  allow create: if isAuthenticated() && 
    request.resource.data.keys().hasAll(['player1', 'language', 'mode', 'status', 'createdAt', 'questions', 'answers', 'ratingBefore', 'ratingAfter', 'ratingChange']) &&
    request.resource.data.player1.uid == request.auth.uid &&
    request.resource.data.language in ['HTML', 'CSS', 'JavaScript'] &&
    request.resource.data.mode in ['solo', '3min', '5min', 'survival'] &&
    request.resource.data.status == 'completed';
  
  // Solo matches are immutable once created (no updates allowed)
  allow update: if false;
  allow delete: if false;
}
```

**Key Changes:**
1. **Read Rule Enhancement:** Spectators can read completed matches (public history)
2. **Create Validation:** Stricter field requirements:
   - Must include `ratingBefore`, `ratingAfter`, `ratingChange`
   - Must include `questions` (full question objects)
   - Must include `answers` array
   - Status must be `'completed'` only
3. **Immutability:** No updates allowed (prevents tampering with match records)
4. **Ownership:** Verified via `player1.uid == request.auth.uid`

---

## Required Fields in Solo Match Document

When creating a solo match via `createSoloMatch()`, ensure the document includes:

```typescript
{
  // REQUIRED for rules validation:
  player1: {
    uid: string              // ← Must match request.auth.uid
    username: string
    profilePicture?: string
    languageRatings: object  // ← Snapshot at match time
    score: number
    correctAnswers: number
    wrongAnswers: number
    answers: (number | null)[]
    ready: boolean
  },
  language: "HTML" | "CSS" | "JavaScript",  // ← Validated
  mode: "solo" | "3min" | "5min" | "survival",  // ← Validated
  status: "completed",                      // ← Must be "completed"
  createdAt: number,                        // ← Validated present
  questions: Array<{...}>,                  // ← Full questions required
  answers: (number | null)[],               // ← Answers required
  ratingBefore: number,                     // ← NEW: Required
  ratingAfter: number,                      // ← NEW: Required
  ratingChange: number,                     // ← NEW: Required
  
  // Optional but recommended:
  gameMode?: string
  isRated?: boolean
  startedAt?: number
  endedAt?: number
  winner?: string
  results?: {
    player1: {
      score: number
      accuracy: number
      correctAnswers: number
    }
  }
  sessionQuestions?: Array<{
    questionId: string
    correct: boolean
    timeSpent: number
  }>
}
```

---

## Deployment Commands

### Deploy Rules
```bash
firebase deploy --only firestore:rules
```

### Deploy Indexes
```bash
firebase deploy --only firestore:indexes
```

### Both
```bash
firebase deploy --only firestore
```

---

## Verification Checklist

After deployment:

- [ ] Rules deployed successfully (`firebase deploy --only firestore:rules`)
- [ ] Indexes deployed successfully (`firebase deploy --only firestore:indexes`)
- [ ] Index status shows "Enabled" in Firebase Console (may take 5-15 min)
- [ ] New solo match creation succeeds (test in app)
- [ ] No "Permission denied" errors in logs
- [ ] History queries load without errors
- [ ] Review pages display match data

---

## Key Differences from Old `game_sessions`

| Aspect | game_sessions | solo_matches |
|--------|---------------|-------------|
| **Purpose** | Live game state | Canonical final record |
| **Status** | in_progress, completed, abandoned | completed only |
| **Questions** | Per-question summaries | Full question objects |
| **User Answers** | Stored in answers array | Stored + timeSpent per question |
| **Rating Data** | No snapshots | ratingBefore, ratingAfter, ratingChange |
| **Updatable** | Yes (live updates) | No (immutable) |
| **Lifetime** | Session duration | Permanent |
| **Storage** | ~50KB per match | ~150-300KB per match |

---

## Summary

**What to Deploy:**
1. ✅ Updated `firestore.rules` (include enhanced `solo_matches` rules)
2. ✅ `firestore.indexes.json` (solo_matches index already configured)

**What Changes in Firestore:**
- New rules for `solo_matches` requiring `ratingBefore`, `ratingAfter`, `ratingChange`
- Immutability enforced (no updates)
- Stricter field validation on creation

**No Manual Data Migration Required:**
- Old `game_sessions` remain unchanged
- New matches go to `solo_matches` automatically
- Review pages support both collections (prefer `solo_matches`)

**Timeline to Production:**
1. Deploy rules: < 1 minute
2. Deploy indexes: 5-15 minutes (index building)
3. Verify in console: 1 minute
4. **Total: ~20 minutes**

---

## Questions?

Refer to:
- `FIRESTORE_SETUP_GUIDE.md` — Detailed rules and index documentation
- `MANUAL_TESTING_GUIDE.md` — Test procedures and verification
- `IMPLEMENTATION_SUMMARY.md` — Full implementation overview

