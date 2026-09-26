// End-to-end test script - run this AFTER your server is already running (npm run dev).
// It walks through the full flow: create user -> set budget -> log transactions ->
// check summary -> check forecast -> check savings tips. Prints PASS/FAIL for each step.
//
// Run with: node test-e2e.js

const BASE_URL = 'http://localhost:5000';
let passed = 0, failed = 0;

function check(label, condition, detail) {
  if (condition) {
    console.log(`PASS - ${label}`);
    passed++;
  } else {
    console.log(`FAIL - ${label}${detail ? ' | ' + detail : ''}`);
    failed++;
  }
}

async function run() {
  // Step 0: server alive
  try {
    const res = await fetch(`${BASE_URL}/api/status`);
    const data = await res.json();
    check('Server is running and reachable', res.status === 200 && data.message, JSON.stringify(data));
  } catch (e) {
    console.log('FAIL - Cannot reach server. Is `npm run dev` running in another terminal tab?');
    console.log('Error:', e.message);
    process.exit(1);
  }

  // Step 1: create a user
  const uniqueEmail = `test${Date.now()}@example.com`;
  let userId;
  try {
    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test User', email: uniqueEmail, monthlyIncome: 4000 }),
    });
    const data = await res.json();
    check('Create user (POST /api/users)', res.status === 201 && data._id, JSON.stringify(data));
    userId = data._id;
  } catch (e) {
    console.log('FAIL - Create user threw an error:', e.message);
  }

  if (!userId) {
    console.log('\nStopping early - cannot continue without a valid userId.');
    console.log(`${passed} passed, ${failed} failed`);
    process.exit(1);
  }

  // Step 1b: validation should reject bad data
  try {
    const res = await fetch(`${BASE_URL}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: '', monthlyIncome: -5 }),
    });
    check('Reject invalid user data (should be 400)', res.status === 400);
  } catch (e) {
    console.log('FAIL - Validation test threw an error:', e.message);
  }

  // Step 2: create budget categories
  try {
    const res1 = await fetch(`${BASE_URL}/api/budget/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: 'Food', budgetAmount: 400 }),
    });
    const res2 = await fetch(`${BASE_URL}/api/budget/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, name: 'Rent', budgetAmount: 1200 }),
    });
    check('Create Food category', res1.status === 201);
    check('Create Rent category', res2.status === 201);
  } catch (e) {
    console.log('FAIL - Create categories threw an error:', e.message);
  }

  // Step 3: log transactions
  try {
    const t1 = await fetch(`${BASE_URL}/api/budget/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category: 'Food', amount: 100, note: 'Groceries' }),
    });
    const t2 = await fetch(`${BASE_URL}/api/budget/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category: 'Food', amount: 150, note: 'Takeout' }),
    });
    const t3 = await fetch(`${BASE_URL}/api/budget/transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, category: 'Rent', amount: 1200 }),
    });
    check('Log Food transaction #1', t1.status === 201);
    check('Log Food transaction #2', t2.status === 201);
    check('Log Rent transaction', t3.status === 201);
  } catch (e) {
    console.log('FAIL - Log transactions threw an error:', e.message);
  }

  // Step 4: check budget summary (the progress bar data)
  try {
    const res = await fetch(`${BASE_URL}/api/budget/summary/${userId}`);
    const data = await res.json();
    const food = data.find((c) => c.category === 'Food');
    const rent = data.find((c) => c.category === 'Rent');
    check('Budget summary returns both categories', data.length === 2, JSON.stringify(data));
    check('Food category: spent=250, remaining=150, 63%', food && food.spent === 250 && food.remaining === 150 && food.percentUsed === 63, JSON.stringify(food));
    check('Rent category: spent=1200, 100% used', rent && rent.spent === 1200 && rent.percentUsed === 100, JSON.stringify(rent));
  } catch (e) {
    console.log('FAIL - Budget summary threw an error:', e.message);
  }

  // Step 5: check forecast
  try {
    const res = await fetch(`${BASE_URL}/api/forecast/${userId}`);
    const data = await res.json();
    check('Forecast responds with a numeric forecastTotal', typeof data.forecastTotal === 'number', JSON.stringify(data));
    check('Forecast includes a trend value', ['rising', 'falling', 'flat'].includes(data.trend), JSON.stringify(data));
  } catch (e) {
    console.log('FAIL - Forecast threw an error:', e.message);
  }

  // Step 6: check savings tips (works with or without an API key set)
  try {
    const res = await fetch(`${BASE_URL}/api/savings-tips/${userId}`);
    const data = await res.json();
    check('Savings tips returns an array of tips', Array.isArray(data.tips) && data.tips.length > 0, JSON.stringify(data));
    console.log(`   (source: ${data.source || 'n/a'} - "fallback" is expected if you haven't added an API key yet)`);
  } catch (e) {
    console.log('FAIL - Savings tips threw an error:', e.message);
  }

  // Step 7: 404 handling for a made-up user id
  try {
    const res = await fetch(`${BASE_URL}/api/users/64f000000000000000000000`);
    check('Unknown user id returns 404', res.status === 404);
  } catch (e) {
    console.log('FAIL - 404 test threw an error:', e.message);
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();