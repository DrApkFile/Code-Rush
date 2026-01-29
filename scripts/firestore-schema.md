# CodeRush Firestore Schema

## Collections

### `questions` Collection

Document structure for each question:

\`\`\`json
{
  "id": "auto-generated",
  "content": "Which HTML tag is used to define a hyperlink?",
  "language": "HTML" | "CSS" | "JavaScript",
  "format": "MCQ" | "Fill in the Blank" | "Fix the Code",
  "difficulty": "Easy" | "Medium" | "Hard",
  "options": ["<link>", "<a>", "<href>", "<url>"],
  "correctAnswerIndex": 1,
  "explanation": "The <a> tag defines a hyperlink in HTML.",
  "tags": ["semantic", "fundamentals"],
  "category": "HTML Basics",
  "createdAt": "2025-01-01T00:00:00Z"
}
\`\`\`

### Indexes

For optimal performance, create these Firestore indexes:
- `language` (Ascending)
- `language, format` (Ascending, Ascending)
- `language, difficulty` (Ascending, Ascending)
- `language, format, difficulty` (Ascending, Ascending, Ascending)

## Caching Strategy

### Two-Tier Cache System

1. **SessionStorage** (L1 - Fastest)
   - In-memory cache during active gameplay
   - Cleared on page reload
   - Key format: `questions_{language}_{format}`

2. **IndexedDB** (L2 - Persistent)
   - Persists across browser sessions
   - Survives page reloads
   - Store name: `CodeRushCache`
   - Preloads 20 questions per language/format combo

### Cache Invalidation
- TTL: 24 hours
- Manual refresh on startup
- Cleared via `clearQuestionCache()` or `clearAllQuestionCaches()`

## Randomization

Questions are randomized using Fisher-Yates shuffle:
- Entire question set is shuffled before selecting N questions
- Options within each question are shuffled independently
- Correct answer index is updated to match shuffled position
