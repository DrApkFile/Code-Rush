# Firestore Rules & Indexes Update

## Updated Firestore Rules

The `firestore.rules` file has been enhanced to support the complete friend challenge system with throttle checking.

### Key Changes to Challenges Collection

**Previous Rules:**
- Basic read/create/update/delete permissions
- Missing `creatorElo` and `expiresAt` fields
- Insufficient validation for throttle checking queries
- Missing `notificationId` field support

**New Rules:**
```javascript
match /challenges/{challengeId} {
  // Allow reading challenges involving the user or public pending challenges
  allow get: if isAuthenticated() && 
    (resource.data.creatorId == request.auth.uid || 
     resource.data.opponentId == request.auth.uid ||
     (resource.data.status == 'pending' && !resource.data.opponentId));
  
  // Allow listing challenges for throttle checking and history
  allow list: if isAuthenticated();
  
  // Allow creating challenges with required fields for throttle checking
  allow create: if isAuthenticated() && 
    request.resource.data.creatorId == request.auth.uid &&
    request.resource.data.keys().hasAll(['creatorId', 'creatorUsername', 'creatorElo', 'mode', 'language', 'questionFormat', 'isRated', 'status', 'createdAt', 'expiresAt']) &&
    request.resource.data.status == 'pending' &&
    request.resource.data.creatorElo is number;
  
  // Allow updating status (accept/decline/match creation)
  allow update: if isAuthenticated() && 
    (resource.data.creatorId == request.auth.uid || 
     resource.data.opponentId == request.auth.uid ||
     (resource.data.status == 'pending' && !resource.data.opponentId && request.resource.data.opponentId == request.auth.uid)) &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasAny(['status', 'acceptedAt', 'declinedAt', 'completedAt', 'matchId', 'notificationId', 'opponentId', 'opponentUsername', 'opponentElo', 'opponentProfilePic']);
}
```

### Features
1. **Throttle Checking**: `list` permission allows querying challenges by `creatorId` and `createdAt` to implement 5-tries-in-2-hours limit
2. **Shareable Challenges**: Public pending challenges (no `opponentId`) can be read by anyone and updated by opponent
3. **Complete Fields**: Requires `creatorElo` and `expiresAt` for challenge data integrity
4. **Status Tracking**: Supports all challenge states: pending, accepted, in_progress, completed, expired, declined

---

## Required Firestore Indexes

Add the following indexes to your Firestore database. These will optimize queries for throttle checking and challenge history.

### Index 1: Challenge Throttle Check (Most Important)
```
Collection: challenges
Fields:
  - creatorId (Ascending)
  - createdAt (Descending)
Query: Retrieve all challenges created by a user in the last 2 hours
```

**CLI Deployment:**
```bash
firebase firestore:indexes:create \
  --collection=challenges \
  --field-config='creatorId=Ascending,createdAt=Descending'
```

### Index 2: Challenge Lookup by Match ID
```
Collection: challenges
Fields:
  - matchId (Ascending)
Query: Used to load challenge details from countdown page using matchId
```

**CLI Deployment:**
```bash
firebase firestore:indexes:create \
  --collection=challenges \
  --field-config='matchId=Ascending'
```

### Index 3: Match History for Player
```
Collection: matches
Fields:
  - player1.uid (Ascending)
  - createdAt (Descending)
Query: Retrieve all matches for a specific player
```

**CLI Deployment:**
```bash
firebase firestore:indexes:create \
  --collection=matches \
  --field-config='player1.uid=Ascending,createdAt=Descending'
```

---

## How to Deploy

### Option 1: Using Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database** → **Indexes**
4. Click **Create Index**
5. For each index above, fill in:
   - Collection ID
   - Field paths with order (Ascending/Descending)
6. Click **Create**

### Option 2: Using Firebase CLI
```bash
# Deploy updated rules
firebase deploy --only firestore:rules

# Firebase CLI will auto-detect and prompt you to create missing indexes
# Or manually add indexes to firestore.indexes.json and deploy
firebase deploy --only firestore:indexes
```

### Option 3: Using firestore.indexes.json
Update your `firestore.indexes.json` with the new indexes (provided in `firestore.indexes.new.json`), then:
```bash
firebase deploy --only firestore:indexes
```

---

## Query Impact

### Throttle Check Query (in `friend-challenges.ts`)
```typescript
const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
const q = query(
  collection(db, "challenges"),
  where("creatorId", "==", userId),
  where("createdAt", ">", twoHoursAgo),
)
```
**Optimized by:** Index 1 (creatorId + createdAt)

### Challenge Lookup Query (in `friend-challenges.ts` - getChallengeByMatchId)
```typescript
const q = query(
  collection(db, "challenges"),
  where("matchId", "==", matchId)
)
```
**Optimized by:** Index 2 (matchId)

---

## Security Notes

✅ **Improved Security:**
- Challenge creation now requires all essential fields
- `creatorElo` type validation prevents invalid data
- Throttle queries work within Firestore rules (no client-side bypass)
- Sharable public challenges explicitly marked with `!resource.data.opponentId`

✅ **Throttle Implementation:**
- Server-side enforcement via Firestore rules
- Challenge expiry after 2 minutes (`expiresAt` field)
- 5 attempts per 2-hour rolling window
- Reset time calculated on client for UX feedback

---

## Testing the Indexes

After creating indexes, test with:

```bash
# List all indexes
firebase firestore:indexes:list

# Verify specific index
firebase firestore:indexes:list --collection=challenges
```

Allow 5-10 minutes for indexes to build after creation. During this time, queries will still work but may be slower.
