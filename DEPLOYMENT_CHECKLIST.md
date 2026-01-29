# Deployment Checklist - Canonical Solo Match Persistence

## Pre-Deployment

- [ ] All code compiled successfully (`npm run build`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] All imports resolved correctly
- [ ] Git changes committed (`git commit -m "feat: canonical solo match persistence"`)

## Deployment Steps (In Order)

### Step 1: Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```
- **Duration:** < 1 minute
- **Expected Output:** "✓ Deploy complete!"
- **Verification:** Try to access Firestore console, rules should be active

### Step 2: Deploy Firestore Indexes
```bash
firebase deploy --only firestore:indexes
```
- **Duration:** 5-15 minutes (indexes build in background)
- **Expected Output:** "Index creation in progress..."
- **Verification:** Go to Firebase Console > Firestore > Indexes, watch status

### Step 3: Deploy Application
```bash
# Build production bundle
npm run build

# Deploy to your hosting platform
firebase deploy --only hosting
# OR
vercel deploy --prod
# OR your platform's deploy command
```
- **Duration:** 2-5 minutes
- **Expected Output:** Deployment complete with preview URL

### Step 4: Verify Deployment

**In Firebase Console:**
1. Go to **Firestore > Indexes**
2. Find `solo_matches` index
3. ✅ Status should show "Enabled" (may take up to 15 min)

**In Your Application:**
1. Log in as test user
2. Play a quick 3-minute game
3. Complete the game
4. Check **Firestore Console > Collections > solo_matches**
5. ✅ A new document should appear with your match data

**Check Application Logs:**
- No "Permission denied" errors in console
- No "Index not found" errors
- History loads without lag

## Post-Deployment Monitoring

### Immediate (First Hour)
- [ ] Check for spike in Firestore errors (watch metrics dashboard)
- [ ] Verify match creation still works (test account)
- [ ] Check review pages load correctly
- [ ] Monitor user reports in support channel

### Short-term (First 24 Hours)
- [ ] Index should reach "Enabled" status (if still building)
- [ ] Run full manual test suite (8 tests from `MANUAL_TESTING_GUIDE.md`)
- [ ] Review Firestore metrics:
  - Write latency should be < 1s
  - Read latency should be < 500ms
  - Error rate should be near 0%

### Medium-term (First Week)
- [ ] Gather user feedback
- [ ] Check match creation success rate (should be 100%)
- [ ] Review storage costs (may increase 3-5x)
- [ ] Verify history queries perform well
- [ ] Check for any regressions in game flow

## Rollback Plan (If Needed)

If critical issues arise:

```bash
# Option 1: Revert rules to previous version
git checkout HEAD~1 firestore.rules
firebase deploy --only firestore:rules

# Option 2: Revert application to previous version
git revert HEAD
npm run build
firebase deploy --only hosting

# Option 3: Disable solo_matches reads (keep writes disabled)
# Edit firestore.rules, set solo_matches allow read: if false;
firebase deploy --only firestore:rules
```

## Critical Success Indicators

✅ = Deployment Successful

- [ ] ✅ No "Permission denied" in Firestore rules
- [ ] ✅ New matches appear in `solo_matches` collection
- [ ] ✅ History lists load without errors
- [ ] ✅ Review pages show match data
- [ ] ✅ Rating animation plays correctly
- [ ] ✅ Index shows "Enabled" status within 15 min
- [ ] ✅ No spike in error rates

## Documentation References

- **Setup Guide:** `FIRESTORE_SETUP_GUIDE.md`
- **Manual Tests:** `MANUAL_TESTING_GUIDE.md`
- **Implementation:** `IMPLEMENTATION_SUMMARY.md`
- **Rules Detail:** `firestore.rules`
- **Indexes:** `firestore.indexes.json`

## Support Contacts

- **Firestore Issues:** Firebase Console > Support
- **Code Issues:** Check `MANUAL_TESTING_GUIDE.md` > Troubleshooting
- **Questions:** Review `FIRESTORE_SETUP_GUIDE.md` > Troubleshooting

## Sign-Off

**Deployed by:** ________________________  
**Date:** ________________________  
**Status:** ✅ Complete | ⚠️ In Progress | ❌ Rolled Back  

**Notes:**
_______________________________________________________________________

_______________________________________________________________________

