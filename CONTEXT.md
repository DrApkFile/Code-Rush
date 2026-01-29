🧩 CodeRush Context
Overview

CodeRush is a competitive coding puzzle platform inspired by Chess.com’s Puzzle Rush, but for programming questions.
Players race against time to solve coding questions — solo or against others — in fast-paced timed challenges.

The app is built with:

Next.js (frontend + server functions)

Firebase Firestore (database + realtime updates)

Firebase Auth (for user authentication)

Cloudinary (for profile picture uploads)

🧠 Core Concept

Users improve their coding speed and accuracy by solving randomly generated programming puzzles across multiple formats and difficulty levels.

You can:

Play solo (timed mode or survival mode)

Challenge friends or random players

Watch other matches live

Track ratings and progress for each programming language

🧱 Tech Stack
Feature	Technology
Frontend	Next.js + Tailwind CSS
Auth	Firebase Authentication
Database	Firebase Firestore
Real-time Updates	Firebase Realtime features / Firestore snapshots
Storage	Cloudinary (for profile pictures)
Rating System	Lichess-style Elo algorithm (default starting rating: 400)
Caching	Client-side preloading of questions for faster gameplay
🧍‍♂️ User Flow
1. Signup & Login

Signup using username, email, and password.

Login using email or username + password.

After signup → user is prompted to set up a bio and upload a profile picture (stored via Cloudinary).

2. Dashboard Sections
🕹️ Play Section

Displays:

Friends Online

Last 5 Games

Ratings (per language — HTML, CSS, JS)

Play Button (entry point to game modes)

Game Modes

Solo Play

3-Minute Rush

5-Minute Rush

Survival Mode (3 strikes = game over)

Questions are loaded randomly from Firestore.

Option to preload questions in cache for smoother play.

Play vs Random

Matchmaking with another online player.

Supports all modes (3min, 5min, Survival).

Match setup handled in real time via Firestore listeners.

Play vs Friend

Challenge an existing friend.

Choose mode (3min, 5min, or Survival).

Choose rated or unrated.

Select:

Language(s): HTML, CSS, JS

Question Type(s): Multiple Choice, Fill in the Blank, Complete the Code

Generates a unique challenge link:

If clicked by a logged-in user → joins match with account.

If clicked by a guest → plays as Anonymous.

👥 Friends Section

Search and add other users.

View profiles showing:

Bio

Username

Friend count

Wins / Losses / Draws

Ratings (per language)

Recent games

Options:

Follow / Unfollow

Challenge

Online status indicator:

🟢 Green = Online

🔵 Blue = In-game

If a user is in-game, you can watch their match live.

🎥 Watching System

Spectators can:

See both players’ questions and answers as they appear.

View current scores and remaining time.

Identify failed or correct answers in real-time.

When the match ends, see the final result screen.

If a rematch occurs, spectators are instantly redirected to it.

🏆 Leaderboard Section

Rankings by:

Time Range: All-time, This Month, This Week, Today

Language: HTML, CSS, JS

Each leaderboard uses player Elo ratings.

👤 Profile Section

Displays:

Profile Picture

Bio

Game History

Statistics (total wins, losses, accuracy)

Ratings in all supported languages

⚙️ Settings Section

Users can:

Update username and password

Delete account
(Email is not editable)

🔢 Rating System

Default rating: 400

Elo-style rating system adapted from Lichess

Rating changes apply only to rated matches

Separate ratings maintained per language (HTML, CSS, JS)

🧩 Question Handling

Questions are stored in Firestore with metadata:

language (HTML, CSS, JS)

format (MCQ, Fill in the Blank, Fix the Code)

difficulty (Easy, Medium, Hard)

When a player starts a session:

A random set of questions is fetched (based on filters)

Optionally cached client-side for speed

For multiplayer, both players receive the same question sequence

🕹️ Match Lifecycle

Game created (solo or multiplayer)

Questions loaded (FireStore random fetch)

Timer starts

Each correct answer adds score

In Survival, 3 wrong answers = loss

On finish:

Show results screen

Update ratings (if rated)

Offer rematch option

Spectators redirected if rematch accepted