# BudgetMate AI - High-Fidelity Prototype

SIT317/SIT726 Task 8.2HD - Individual High-Fidelity Prototype, built by Yousuf Sinha
(Student ID: s226032987), based on the team's BudgetMate AI concept from Group 5's
SIT726 project.

BudgetMate AI is an AI-powered budgeting assistant aimed at young professionals in
Australia who want a simple way to track spending, forecast their month, and get
genuinely useful savings advice - without needing to be a finance expert.

## Features

- **Budget Planner** - set a budget per category, log transactions, and see live,
  colour-coded progress bars (green = on track, gold = near the limit, red = over
  budget). Categories can be removed at any time without affecting past transactions.
- **Spending Forecast** - projects the month's likely total spend from real logged
  transactions, with a rising/falling trend indicator. Shows the actual total spent
  so far (rather than an unreliable projection) until at least 3 days of history
  exist, to avoid unrealistic numbers from too little data.
- **Daily Spending Calendar** - a heatmap-style calendar for the current month,
  showing spend intensity per day at a glance.
- **AI Savings Coach** - sends the user's spending, grouped by category, to Google's
  Gemini API and returns three short, personalised savings tips. Falls back to
  rule-based tips automatically if no API key is set or the AI call fails, so the
  feature never breaks.

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** Plain HTML, CSS, and JavaScript (served as static files by Express)
- **AI:** Google Gemini API (`gemini-3.8-flash`)
- **Fonts:** Fraunces (headings) and Inter (body), via Google Fonts

## Setup (GitHub Codespaces)

1. Install dependencies:
   ```
   npm install
   ```
2. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
3. Start MongoDB using Docker:
   ```
   docker run -d -p 27017:27017 --name budgetmate-mongo mongo
   ```
   If the container already exists from a previous session, just start it again:
   ```
   docker start budgetmate-mongo
   ```
   Leave `MONGO_URI` in `.env` as the default (`mongodb://127.0.0.1:27017/budgetmate`).
4. (Optional) Add a free Gemini API key to `.env` as `GEMINI_API_KEY` to enable real
   AI-generated savings tips. Get one at [aistudio.google.com](https://aistudio.google.com).
   Without a key, the Savings Coach still works using rule-based fallback tips.
5. Start the server:
   ```
   npm run dev
   ```
   You should see `MongoDB connected` and `Server running on port 5000`.
6. Open the forwarded port 5000 in your browser to use the app.

## Seeding Demo Data (optional)

To populate the calendar and forecast with realistic-looking history instead of
starting empty, run the seed script once:

```
node seed-demo-data.js <userId>
```

Find your `userId` by opening the app in your browser, opening the console
(F12 -> Console), and running:
```javascript
localStorage.getItem('budgetmate_user_id')
```

## Testing

An end-to-end test script runs against the live server and a real database -
create a test user, set budgets, log transactions, and check every endpoint's
response, including validation and error handling.

```
node test-e2e.js
```

(Requires the server to already be running via `npm run dev` in another terminal.)

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create a user (name, email, monthlyIncome) |
| GET | `/api/users/:id` | Get a user by ID |
| POST | `/api/budget/categories` | Create a budget category |
| DELETE | `/api/budget/categories/:id` | Remove a budget category |
| POST | `/api/budget/transactions` | Log a transaction |
| GET | `/api/budget/summary/:userId` | Budget vs. spent per category |
| GET | `/api/forecast/:userId` | Projected monthly spend and trend |
| GET | `/api/forecast/calendar/:userId` | Daily spending totals for the current month |
| GET | `/api/savings-tips/:userId` | AI-generated (or fallback) savings tips |
| GET | `/api/status` | Simple API health check |

## Project Structure

```
budgetmate-ai/
├── config/db.js            MongoDB connection
├── models/                 Mongoose schemas (User, BudgetCategory, Transaction)
├── routes/                 API route handlers
├── public/                 Frontend (index.html, style.css, app.js)
├── seed-demo-data.js       One-time demo data backfill script
├── test-e2e.js             End-to-end test suite
└── server.js                Express app entry point
```
