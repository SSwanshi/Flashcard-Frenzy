🎮 Flashcard Frenzy Multiplayer

Flashcard Frenzy Multiplayer is a real-time, interactive flashcard game where multiple players compete by answering the same question simultaneously.
The fastest correct answer earns points, and the scoreboard updates instantly for all participants. Perfect for learning, fun, and competition.

🔗 Live Demo: Flashcard Frenzy Multiplayer

📂 Repository: GitHub

✨ Features

🔑 Authentication – Secure login & signup for players.

🃏 Real-Time Flashcards – All logged-in players view the same question at once.

⚡ Fastest Answer Wins – The first correct answer instantly updates the scoreboard.

📊 Live Scoreboard – Real-time score tracking for all players.

💾 Match History – Each game’s questions and scores are stored for later review.

🌍 Multiplayer Support – Players can join and compete in the same match session.

🎨 Modern UI – Built with Next.js App Router and optimized fonts with Geist
.

🛠️ Tech Stack

Frontend: Next.js
 (App Router, React 18, Server Actions)

Database: MongoDB
 (match history, scores, questions)

Realtime: Supabase
 (live updates, subscriptions)

Styling: Tailwind CSS / Shadcn UI (modern, responsive design)

Deployment: Vercel

🚀 Getting Started

Clone the repo and install dependencies:

```
git clone https://github.com/SSwanshi/Flashcard-Frenzy.git

cd flashcard-frenzy

npm install
```

Run the development server:
```
npm run dev
```

Open http://localhost:3000 in your browser.

⚙️ Environment Variables

Create a .env.local file in the root directory and configure the following:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
MONGODB_URI=your_mongodb_connection_string
```

🌍 Deployment

This project is deployed on Vercel:
[Visit Flashcard Frenzy](https://flashcard-frenzy-vs7x.vercel.app)



