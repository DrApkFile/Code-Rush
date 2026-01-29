# CodeRush Lichess-Style Rating System

## Overview

CodeRush implements a Lichess-inspired Elo rating system where each player has **separate ratings for each language** (HTML, CSS, JavaScript). This creates a fair and competitive ranking system.

## Rating Fundamentals

### Default Rating
- **New users start at 400 rating** for each language
- Minimum rating floor: 400 (players cannot drop below this)

### Elo Formula

The system uses the standard Elo rating formula:

\`\`\`
Expected Score = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
Rating Change = K × (Actual Score - Expected Score)
New Rating = Old Rating + Rating Change
\`\`\`

Where:
- **Expected Score**: Probability that the player wins based on rating difference
- **Actual Score**: 1 if won, 0 if lost
- **K-Factor**: Determines how much ratings change after each match

### K-Factor (Volatility)

CodeRush uses adaptive K-factors based on rating to balance new player growth with expert stability:

- **K = 40** for players below 2100 rating (faster movement for newer players)
- **K = 20** for players 2100+ rating (slower movement for established experts)

## Per-Language Ratings

Each user maintains independent ratings for:
- **HTML**: Separate Elo rating starting at 400
- **CSS**: Separate Elo rating starting at 400
- **JavaScript**: Separate Elo rating starting at 400

### Example
A player could have:
- HTML: 1200 (Novice)
- CSS: 1500 (Advanced)
- JavaScript: 1100 (Novice)

## Rating Changes After Matches

### Win Scenarios
- **Win against higher-rated opponent**: Larger rating gain (more points for upset victory)
- **Win against lower-rated opponent**: Smaller rating gain (expected result)
- **Lose against higher-rated opponent**: Smaller rating loss (expected loss)
- **Lose against lower-rated opponent**: Larger rating loss (unexpected loss)

### Example Calculation
\`\`\`
Player A (1200) vs Player B (1600)

Expected Score for A = 1 / (1 + 10^((1600 - 1200) / 400))
                     = 1 / (1 + 10^1)
                     = 1 / 11 ≈ 0.091 (9.1% chance to win)

If A wins (1):
  Rating Change = 40 × (1 - 0.091) = 40 × 0.909 ≈ +36 points
  New Rating = 1200 + 36 = 1236

If A loses (0):
  Rating Change = 40 × (0 - 0.091) = 40 × -0.091 ≈ -4 points
  New Rating = 1200 - 4 = 1196
\`\`\`

## Matching System

When players enter matchmaking, they can be matched with opponents within a rating range:
- This ensures competitive, fair matches
- Rating difference of ±100 is typical for balanced matches
- Wider ranges may be used if queue times are long

## Rating Categories

| Rating | Category | Skill Level |
|--------|----------|------------|
| < 1000 | Beginner | Learning basics |
| 1000-1199 | Novice | Getting comfortable |
| 1200-1399 | Intermediate | Solid fundamentals |
| 1400-1599 | Advanced | Strong player |
| 1600-1799 | Expert | Excellent skills |
| 1800-1999 | Master | Very strong |
| 2000-2199 | Grandmaster | Elite player |
| 2200+ | Super GM | Top tier |

## Important Notes

### Unrated Matches
- Friendly matches don't affect ratings
- Players can practice freely without risk
- Can be used for casual play or skill exploration

### Rated Matches
- Only happen in ranked/competitive modes
- Both players' ratings are updated immediately
- Rating changes are permanent

### Rating Protection
- Minimum rating of 400 prevents negative scores
- No bonus points for playing many games
- Each match is evaluated independently

## Implementation

See `lib/rating-system.ts` for utility functions:
- `calculateEloChange()` - Compute rating change for one player
- `updateLanguageRating()` - Update user's language-specific rating
- `calculateBothPlayersEloChange()` - Get changes for both players
- `getRatingCategory()` - Get rating tier name
- `initializeDefaultRatings()` - Create new user ratings
\`\`\`
