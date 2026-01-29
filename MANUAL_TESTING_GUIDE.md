# Manual Testing Guide - Solo Match Persistence

This guide walks you through validating the new solo match canonical storage implementation.

---

## Pre-Test Checklist

- [ ] Firestore rules deployed (`firebase deploy --only firestore:rules`)
- [ ] Firestore indexes created/building (`firestore.indexes.json`)
- [ ] Application built and running locally (`npm run dev`)
- [ ] Logged in as a test user
- [ ] Clear browser storage to start fresh (optional: `localStorage.clear()`)

---

## Test 1: Create & Persist a Solo Match

### Objective
Verify that playing a solo game creates a complete match record in `solo_matches` with full question data and rating snapshots.

### Steps

1. **Navigate to Play**
   - Go to `/dashboard/play` and select **3min mode** (fastest test)
   - Select any language (e.g., **JavaScript**)
   - Click **Play**

2. **Play a Short Game**
   - Answer **at least 3 questions** (complete ~20 seconds)
   - You can skip or answer incorrectly; both are fine
   - Click **Submit** when done (or wait for timeout)

3. **Verify Results Modal Appears**
   - A **"Game Over"** modal should appear
   - Shows: Points, Accuracy%, Correct count, Answered count
   - Shows: **Animated rating change** (should count up/down from before to after)
   - Click **"Review Questions"** button

4. **Check Review Page**
   - Displays all questions you answered
   - Each shows: **Correct/Incorrect badge**, **Time Spent**, **Question content**
   - Verify questions appear (not missing or corrupted)

### Verification in Firestore Console

Open [Firebase Console](https://console.firebase.google.com) > Your Project > Firestore > Collections:

1. **Look for `solo_matches` collection**
2. **Find the latest document** (newest by `createdAt`)
3. **Inspect the document structure**, verify it contains:
   - ✅ `player1.uid` = your user ID
   - ✅ `player1.username` = your username
   - ✅ `player1.languageRatings` = object with HTML/CSS/JavaScript ratings (snapshot at match time)
   - ✅ `language` = the language you chose
   - ✅ `mode` = `3min` (or your chosen mode)
   - ✅ `status` = `completed`
   - ✅ `questions` array with **3+ objects**, each containing:
     - `id`, `content`, `options`, `correctAnswerIndex`
     - `userAnswerIndex` (your answer, or null if skipped)
     - `timeSpent` (number of seconds)
     - `correct` (boolean)
   - ✅ `answers` array = indices of your answers
   - ✅ `sessionQuestions` array = per-question summaries
   - ✅ `ratingBefore` = your rating before the match
   - ✅ `ratingAfter` = your rating after the match (should be different if you won/lost)
   - ✅ `ratingChange` = delta (after - before)
   - ✅ `results.player1.score`, `.accuracy`, `.correctAnswers`
   - ✅ `createdAt`, `startedAt`, `endedAt` timestamps

**Expected:** All fields present and properly populated. Questions array has full content.

---

## Test 2: Verify Rating Animation

### Objective
Confirm that the results modal animates the rating from `ratingBefore` to `ratingAfter`.

### Steps

1. **Play another 3-min game** (repeat Test 1, steps 1-3)

2. **On Results Modal**
   - Look for the **green (Win) or red (Loss) rating box** in the modal
   - Watch the **large rating number animate** (should count up if you won, down if you lost)
   - Animation duration: ~1-2 seconds
   - After animation stops, number should match the value shown below (**"from BEFORE"** text)

3. **Verify Animation Accuracy**
   - If you gained points (won): rating should **increase** (e.g., 1200 → 1220)
   - If you lost points (lost): rating should **decrease** (e.g., 1200 → 1185)
   - The exact delta depends on difficulty; should match the calculated `ratingChange`

**Expected:** Smooth animation from previous rating to new rating.

---

## Test 3: Navigate to Match Review (Owner)

### Objective
Verify owner can navigate to review page and full question data loads from Firestore.

### Steps

1. **From Dashboard Recent Games**
   - Go to `/dashboard` (or `/dashboard/profile/{yourUsername}`)
   - Scroll to **"Recent Games"** section
   - You should see a **compact row** for your recent match:
     - Language icon (HTML/CSS/JS png)
     - Language name
     - Mode (3min, 5min, etc.)
     - Win/Loss badge (green or red)
     - Rating at time

2. **Click on the Match Row**
   - Should navigate to `/dashboard/match/{matchId}`
   - A modal should appear showing the match summary
   - Close the modal (click X)

3. **Verify Review Section Below**
   - **"Review Questions"** card displays all questions
   - Each question shows:
     - **Question number** badge
     - **Correct/Incorrect** status
     - **Question content** (should be readable text)
     - **Time spent** in seconds
   - All questions should load without errors

4. **Click on a Question Card**
   - A **detailed modal** should open
   - Shows: **Question content, difficulty, all options**
   - Highlights: **Correct answer (green), your answer (yellow/red)**
   - Shows: **Explanation** (if available)

### Verification in Browser DevTools

1. **Open DevTools** > **Network tab**
2. **Reload the review page** (F5)
3. **Look for Firestore calls**:
   - `firebaseapp.com` requests should include a call to fetch the solo_match doc
   - Should see response with full question array

**Expected:** Full question data loads from Firestore, no console errors.

---

## Test 4: Spectator View (Profile Match Review)

### Objective
Verify that spectators (other users) can view match details when visiting someone else's profile.

### Steps

1. **Create a second test account** (or ask a friend)

2. **On Second Account: Friend the First Account**
   - Send friend request to your first test account's username
   - (Or skip if not needed for this test)

3. **On Second Account: Navigate to First Account's Profile**
   - Go to `/dashboard/profile/{first_account_username}`
   - You should see their profile card with username, bio, stats

4. **Scroll to Recent Games**
   - Should show the match you just played
   - Click on a match row

5. **Verify Spectator Match Review**
   - Page title should say **"Match Results"** (not "Game Over")
   - Button should say **"View Details"** (not "Review Questions")
   - Rating display should show:
     - Either `ratingBefore` and `ratingAfter` (if persisted)
     - Or just `ratingChange` delta (if no snapshots available)
   - Questions still show correct/incorrect status

**Expected:** Spectator can view match, sees rating change, questions visible.

---

## Test 5: History Listing Uses Solo Matches

### Objective
Confirm that all history lists now pull from `solo_matches` instead of `game_sessions`.

### Steps

1. **Play 3-5 more solo games** (different modes or languages)

2. **Check Dashboard Overview**
   - Go to `/dashboard`
   - Look for **"Recent Games"** card (top right)
   - Should list your 5 most recent solo matches
   - Each row should display language icon, mode, rating, Win/Loss

3. **Check Dashboard Profile Section**
   - Go to `/dashboard/profile/{yourUsername}`
   - Scroll to **"Recent Games"** section
   - Should show all your solo matches in chronological order (newest first)

4. **Verify Data Freshness**
   - Play a **new game**
   - Return to dashboard (refresh page)
   - New match should appear at **top** of recent games

### Verification in Firebase Console

1. Check `solo_matches` collection: should have **5+ documents**
2. Check `game_sessions` collection: may have 1 per active session (in-progress games)
3. Verify `solo_matches` documents are ordered by `createdAt` (newest first in UI)

**Expected:** All history lists display fresh solo match data with no lag.

---

## Test 6: In-Progress Review (Fallback to SessionStorage)

### Objective
Verify that in-play review pages work correctly (fallback to sessionStorage for incomplete games).

### Steps

1. **Start a 3-minute game** but don't complete it
   - Play through a few questions
   - Press F5 to **refresh the page**

2. **Game should resume** (if resume feature is implemented)
   - Or navigate back to game setup

3. **Complete the game**
   - Answer all questions, submit

4. **Click "Review Questions"** in results modal
   - Page loads: `/dashboard/play/3min/game/{gameId}/review`
   - Questions display correctly
   - Should load from **Firestore** (if already saved to `solo_matches`)
   - Or **SessionStorage** (if still in-progress)

**Expected:** Review works with or without Firestore data (graceful fallback).

---

## Test 7: Error Cases

### Objective
Verify error handling when data is missing or corrupted.

### Steps

1. **Try to access a non-existent match review**
   - Navigate to `/dashboard/match/fake-match-id`
   - Should show **"Match not found"** error message
   - No console crashes

2. **Try to access a match from another user directly**
   - Get match ID from spectator review
   - Switch accounts in Firestore (simulate via DevTools)
   - Try to access: `/dashboard/match/{other_user_match_id}`
   - Should show **"Match not found"** or permission error
   - No console crashes

**Expected:** Graceful error messages, no crashes.

---

## Test 8: Rating Change Calculation

### Objective
Verify that rating changes are correctly calculated and persisted.

### Steps

1. **Note your current ratings**
   - Go to profile, record your HTML/CSS/JavaScript ratings

2. **Play a 3-min HTML game and intentionally lose**
   - Answer wrong or skip most questions

3. **Check rating after (should be lower)**
   - Review results modal, note rating change
   - Go to profile, verify new rating is lower

4. **Play again and intentionally win**
   - Answer correctly

5. **Check rating after (should be higher)**
   - Results modal shows positive change
   - Profile rating increased

6. **Verify `solo_matches` document**
   - In Firestore Console, check latest match
   - `ratingBefore` matches your rating before the match
   - `ratingAfter` matches your rating after
   - `ratingChange` = `ratingAfter - ratingBefore`
   - Negative for loss, positive for win

**Expected:** Rating deltas are accurate and consistent.

---

## Troubleshooting Failures

### Issue: "Match not found" on review page
**Check:**
- Solo match document exists in Firestore
- Document ID matches URL parameter
- User is authenticated
- Firestore rules allow read access

### Issue: Questions not displaying
**Check:**
- `questions` array exists in solo_match document
- Each question has `content`, `options`, `correctAnswerIndex`
- No console JavaScript errors
- Try refreshing page

### Issue: Rating animation doesn't play
**Check:**
- `ratingBefore` and `ratingAfter` fields exist in document
- Values are different (otherwise no animation needed)
- Browser console has no errors
- Check animation duration (should be ~1-2 seconds)

### Issue: History list empty
**Check:**
- Played at least one game
- User is logged in
- `getUserSoloMatches` is being called (check Network tab)
- Firestore index is built (check Console > Firestore > Indexes)

### Issue: Permission denied when creating match
**Check:**
- User is authenticated (`request.auth != null`)
- `player1.uid` in document equals user's UID
- All required fields present: `player1`, `language`, `mode`, `status`, `createdAt`, `questions`, `answers`, `ratingBefore`, `ratingAfter`, `ratingChange`
- `status` = `completed`
- Check Firestore rules in console for specific error

---

## Performance Benchmarks (Expected)

| Action | Expected Time |
|--------|----------------|
| Create solo match | < 1s |
| Load match review page | < 2s |
| Animate rating (1-2 sec duration) | 1-2s |
| List 5 recent games | < 500ms |
| Load all questions for review | < 500ms (after page load) |

---

## Sign-Off Checklist

After completing all tests, check off:

- [ ] Test 1: Solo match created with full data
- [ ] Test 2: Rating animation plays correctly
- [ ] Test 3: Owner can review their matches
- [ ] Test 4: Spectator can view match details
- [ ] Test 5: History lists show solo matches
- [ ] Test 6: In-progress review works (fallback)
- [ ] Test 7: Error cases handled gracefully
- [ ] Test 8: Rating changes accurate

**Status:** ✅ **All tests passing** = Canonical solo match persistence is working as designed!

---

## Next Steps

After successful testing:
1. ✅ Push changes to production
2. ✅ Monitor Firestore metrics for query latency
3. ✅ Gather user feedback on new history/review flow
4. ✅ Consider migrating old `game_sessions` to `solo_matches` (optional, for data consistency)

