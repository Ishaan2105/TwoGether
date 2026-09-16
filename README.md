# ⚡ TwoGether — Unbreakable Accountability

Two people commit to habits together, and their progress affects a shared **Duo identity**:
synergy, streaks, XP, nudges, shields and weekly **Duo Arena** battles.

This monorepo is the MERN implementation of the TwoGether platform.

## Tech stack

| Layer     | Technology                                              |
| --------- | ------------------------------------------------------- |
| Frontend  | React 18 · Vite · React Router · Axios · Context API    |
| Backend   | Node.js · Express · Mongoose · JWT · bcryptjs           |
| Database  | MongoDB Atlas                                           |
| Later     | Socket.IO · node-cron · web-push · Recharts · Framer Motion |

## Project structure

```
DuoHabit/
├── client/                  # React + Vite frontend
│   └── src/
│       ├── components/common/
│       ├── context/         # AuthContext (Duo/Theme contexts later)
│       ├── pages/           # Landing, Login, Register, Dashboard
│       ├── services/        # api.js (axios), auth.js
│       └── App.jsx
└── server/                  # Express API
    ├── config/db.js
    ├── controllers/         # authController
    ├── models/              # User (Duo, Habit, DailyHabitLog… later)
    ├── middleware/          # auth (JWT), error, rate limiter
    ├── routes/              # authRoutes
    ├── utils/               # jwt, generateCode
    └── server.js
```

## Setup

1. **Install dependencies**

   ```bash
   npm run install:all
   ```

2. **Configure the backend** — copy `server/.env.example` to `server/.env` and fill in:

   ```env
   MONGO_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/duohabit
   JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))">
   ```

   Create a free MongoDB Atlas cluster if you don't have one: <https://www.mongodb.com/atlas>

3. **Run both servers** (API on :5000, Vite dev on :5173 with `/api` proxied)

   ```bash
   npm run dev
   ```

   Or separately: `npm run dev:server` / `npm run dev:client`.

## API (implemented so far)

| Method | Endpoint             | Description                          |
| ------ | -------------------- | ------------------------------------ |
| POST   | `/api/auth/register` | Create account → `{ token, user }`   |
| POST   | `/api/auth/login`    | Email/username + password → token    |
| GET    | `/api/auth/me`       | Current user (Bearer token required) |
| GET    | `/api/health`        | Health check                         |

Responses use a consistent envelope: `{ "success": true, "data": … }` / `{ "success": false, "message": … }`.

## Roadmap

- ✅ **Milestone 1–2 (Foundation + Identity):** monorepo, Express + MongoDB wiring, User model,
  bcrypt hashing, JWT auth, login/register UI, protected dashboard with Duo invite code display
- ⏭️ **Milestone 3 (Duo):** pairing by code/request, Duo model, DuoContext, pairing UI
- ⏭️ **Milestone 4 (Habits):** Habit + DailyHabitLog models, CRUD, check-in
- ⏭️ **Milestone 5 (Gamification):** synergy, streaks, XP/levels, badges, shields
- ⏭️ **Milestone 6+ (Real time → Arena → PWA):** Socket.IO, nudges/SOS, web push, insights,
  Elo matchmaking, leaderboard, seasons, offline support