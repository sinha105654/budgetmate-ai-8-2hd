# BudgetMate AI - High-Fidelity Prototype

SIT317/SIT726 Task 8.2HD - Individual High-Fidelity Prototype, built by Yousuf Sinha
(Student ID: s226032987), based on the team's BudgetMate AI concept from Group 5's
SIT726 project.

BudgetMate AI is an AI-powered budgeting assistant for young professionals in Australia
who want a simple way to track spending, forecast their month, and get useful savings
advice without being a finance expert.

## Features

- **Budget Planner** - set a monthly budget per category, log spending, and see live,
  colour-coded progress bars (green = on track, gold = near the limit, red = over budget).
  Bars reset at the start of each month. Categories can be removed at any time.
- **Budget warnings** - a gold banner appears when a category reaches 80% of its budget,
  and a red banner appears when it goes over.
- **Type-to-log (AI)** - type a sentence like "spent 12 on sport" and the AI fills in the
  form. The user checks the details and clicks Log Spend, so the AI never saves anything
  by itself. If the sentence does not match one of the user's categories, nothing is filled
  in and a message explains why.
- **Spending Forecast** - projects the month's total spend from the average daily spend so
  far this month. Until 3 days of the month have passed, it shows the actual total so far
  instead of an unreliable projection.
- **Daily Spending Calendar** - a heatmap-style calendar for the current month showing how
  much was spent each day.
- **AI Savings Coach** - sends this month's spending and budgets to Google's Gemini API and
  returns three short, personalised savings tips, including any category that is close to
  or over budget. If the AI is busy, it retries, tries a second model, and finally falls
  back to simple rule-based tips, so the feature never breaks.

All features only count the current month, and only categories that still exist in the
budget. Transactions can only be logged to an existing category (capital letters do not
matter).

## Tech Stack

- **Backend:** Node.js, Express, MongoDB (Mongoose)
- **Frontend:** Plain HTML, CSS and JavaScript (served as static files by Express)
- **AI:** Google Gemini API (`gemini-flash-lite-latest` first, `gemini-3.8-flash` as backup)
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
   If the container already exists from a previous session, start it again:
```
   docker start budgetmate-mongo
```
   Leave `MONGO_URI` in `.env` as the default (`mongodb://127.0.0.1:27017/budgetmate`).
4. Add a free Gemini API key to `.env` as `GEMINI_API_KEY` (get one at
   [aistudio.google.com](https://aistudio.google.com)). Without a key, the app still
   works, but the Savings Coach shows rule-based tips and Type-to-log is unavailable.
5. Start the server:
```
   npm run dev
```
   You should see `Server running on port 5000` and `MongoDB connected`.
6. Open the forwarded port 5000 in your browser.

If you see `EADDRINUSE`, an older copy of the app is still running. Stop it with
`fuser -k 5000/tcp` and start again.

## Demo Data (optional)

To fill the calendar and forecast with example history, run the seed script once:

```
node seed-demo-data.js <userId>
```

Find your `userId` by opening the app, pressing F12, opening the Console, and running:

```javascript
localStorage.getItem('budgetmate_user_id')
```

The script adds Food, Transport and Entertainment categories if they are missing, and
spreads example spending across the days of the current month.

## Testing

An end-to-end test script runs against the live server and a real database. It creates a
test user, sets budgets, logs transactions, and checks each endpoint, including validation
and error handling.

```
node test-e2e.js
```

The server must already be running (`npm run dev` in another terminal).

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users` | Create a user (name, email, monthlyIncome) |
| GET | `/api/users/:id` | Get a user by ID |
| POST | `/api/budget/categories` | Create a monthly budget category |
| DELETE | `/api/budget/categories/:id` | Remove a budget category |
| POST | `/api/budget/transactions` | Log a transaction (category must exist in the budget) |
| GET | `/api/budget/summary/:userId` | Budget vs. spent per category, this month |
| GET | `/api/forecast/:userId` | Projected spend for this month and trend |
| GET | `/api/forecast/calendar/:userId` | Daily spending totals for this month |
| GET | `/api/savings-tips/:userId` | AI savings tips (or rule-based backup tips) |
| POST | `/api/quick-log` | Turns a typed sentence into a category, amount and note (does not save) |
| GET | `/api/status` | Simple API health check |

## Project Structure

```
budgetmate-ai/
├── config/db.js            MongoDB connection
├── models/                 Mongoose schemas (User, BudgetCategory, Transaction)
├── routes/                 API route handlers
├── utils/
│   ├── month.js            Shared "this month" date range
│   └── gemini.js           Gemini helper with retry and backup model
├── public/                 Frontend (index.html, style.css, app.js)
├── seed-demo-data.js       Demo data script
├── test-e2e.js             End-to-end test suite
├── .env.example            Settings template (copy to .env)
└── server.js               Express app entry point
```

## Limitations and Next Steps

- **Single demo user.** The prototype creates one user and remembers it in the browser, so
  the focus stays on the budgeting features. A full version needs register, login and
  logout with hashed passwords (bcrypt) and login tokens (JWT), as set out in the team's
  Design and Technology Plan.
- **Manual entry.** Spending is typed in, either in the form or with Type-to-log. Receipt
  photo scanning is a planned extension.
- **Past months.** Only the current month is shown. A month picker would let users look
  back.
