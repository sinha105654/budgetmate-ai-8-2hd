const API_BASE = '/api';

// For this prototype, one demo user is created automatically on first load
// and remembered for the session (see initUser below).
let currentUserId = null;

// ---------- Tab switching ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(btn.dataset.tab).classList.add('active');
  });
});

// ---------- Init: create or reuse a demo user ----------
async function initUser() {
  const savedId = localStorage.getItem('budgetmate_user_id');
  if (savedId) {
    currentUserId = savedId;
    return;
  }
  const res = await fetch(`${API_BASE}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Demo User',
      email: `demo${Date.now()}@budgetmate.app`,
      monthlyIncome: 4000,
    }),
  });
  const user = await res.json();
  currentUserId = user._id;
  localStorage.setItem('budgetmate_user_id', currentUserId);
}

// ---------- Budget Planner: add category ----------
document.getElementById('category-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('category-name').value.trim();
  const budgetAmount = Number(document.getElementById('category-budget').value);

  await fetch(`${API_BASE}/budget/categories`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId, name, budgetAmount }),
  });

  e.target.reset();
  loadBudgetSummary();
});

// ---------- Budget Planner: log a transaction ----------
document.getElementById('transaction-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const category = document.getElementById('txn-category').value.trim();
  const amount = Number(document.getElementById('txn-amount').value);
  const note = document.getElementById('txn-note').value.trim();

  await fetch(`${API_BASE}/budget/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUserId, category, amount, note }),
  });

  e.target.reset();
  loadBudgetSummary();
  loadForecast(); // spending changed, so refresh the forecast too
  loadCalendar();
});

// ---------- Load + render budget summary (progress bars) ----------
async function loadBudgetSummary() {
  const container = document.getElementById('budget-summary');
  const res = await fetch(`${API_BASE}/budget/summary/${currentUserId}`);
  const summary = await res.json();

  // ----- Warning banners -----
  const alertBox = document.getElementById('budget-alert');
  const over = summary.filter((c) => c.percentUsed >= 100);
  const near = summary.filter((c) => c.percentUsed >= 80 && c.percentUsed < 100);
  let alertHtml = '';
  if (over.length) {
    const list = over
      .map((c) => `${escapeHtml(c.category)} ($${c.spent} of $${c.budgetAmount}, $${c.spent - c.budgetAmount} over)`)
      .join(', ');
    alertHtml += `<div class="budget-alert over-alert">Over budget: ${list}</div>`;
  }
  if (near.length) {
    const list = near.map((c) => `${escapeHtml(c.category)} (${c.percentUsed}% used)`).join(', ');
    alertHtml += `<div class="budget-alert near-alert">Close to the limit: ${list}</div>`;
  }
  alertBox.innerHTML = alertHtml;

  if (!summary.length) {
    container.innerHTML = '<p class="empty-state">Add a category and log a transaction to see your progress here.</p>';
    return;
  }

  container.innerHTML = summary
    .map((cat) => {
      const pct = Math.min(cat.percentUsed, 100);
      const fillClass = cat.percentUsed >= 100 ? 'over' : cat.percentUsed >= 80 ? 'warning' : '';
      return `
        <div class="category-row">
          <div class="category-row-top">
            <span class="category-name">${escapeHtml(cat.category)}</span>
            <span class="category-figures">
              $${cat.spent} / $${cat.budgetAmount}
              <button class="delete-category-btn" data-id="${cat.categoryId}" title="Remove ${escapeHtml(cat.category)}" aria-label="Remove ${escapeHtml(cat.category)}">&times;</button>
            </span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

// Delete category button (event delegation, since rows are re-rendered each time)
document.getElementById('budget-summary').addEventListener('click', async (e) => {
  if (!e.target.classList.contains('delete-category-btn')) return;
  const categoryId = e.target.dataset.id;
  const confirmed = confirm('Remove this category? This only removes the budget entry - logged transactions stay in your history.');
  if (!confirmed) return;

  await fetch(`${API_BASE}/budget/categories/${categoryId}`, { method: 'DELETE' });
  loadBudgetSummary();
});

// ---------- Load + render forecast ----------
async function loadForecast() {
  const container = document.getElementById('forecast-content');
  const res = await fetch(`${API_BASE}/forecast/${currentUserId}`);
  const data = await res.json();

  if (!data.daysSoFar) {
    container.innerHTML = '<p class="empty-state">Log some transactions in the Budget Planner tab first.</p>';
    return;
  }

  if (data.notEnoughData) {
    container.innerHTML = `
      <div class="forecast-label">Total spent so far</div>
      <div class="forecast-number">$${data.totalSoFar.toLocaleString()}</div>
      <div class="forecast-label">${escapeHtml(data.message)}</div>
    `;
    return;
  }

  container.innerHTML = `
    <div class="forecast-label">Projected monthly spend</div>
    <div class="forecast-number">$${data.forecastTotal.toLocaleString()}</div>
    <div class="forecast-label">Based on a daily average of $${data.dailyAverage} over ${data.daysSoFar} day(s)</div>
    <span class="trend-badge ${data.trend}">${capitalize(data.trend)}</span>
  `;
}

// ---------- Load + render the daily spending calendar ----------
async function loadCalendar() {
  const grid = document.getElementById('spending-calendar');
  const weekdaysEl = document.getElementById('calendar-weekdays');
  const res = await fetch(`${API_BASE}/forecast/calendar/${currentUserId}`);
  const data = await res.json();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  document.getElementById('calendar-month-label').textContent = `${monthNames[data.month]} ${data.year}`;

  const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdaysEl.innerHTML = weekdayLabels.map((d) => `<span>${d}</span>`).join('');

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === data.year && today.getMonth() === data.month;
  const todayDate = today.getDate();

  const cells = [];

  // Empty cells to align the 1st of the month with the correct weekday
  for (let i = 0; i < data.firstWeekday; i++) {
    cells.push('<div class="calendar-day empty"></div>');
  }

  for (let day = 1; day <= data.daysInMonth; day++) {
    const amount = data.dailyTotals[day] || 0;
    const level = spendLevel(amount, data.highestDay);
    const isToday = isCurrentMonth && day === todayDate;
    cells.push(`
      <div class="calendar-day ${level ? 'level-' + level : ''} ${isToday ? 'today' : ''}">
        <span class="day-num">${day}</span>
        ${amount > 0 ? `<span class="day-amount">$${amount}</span>` : ''}
      </div>
    `);
  }

  grid.innerHTML = cells.join('');
}

// Buckets a day's spend into 0 (none) - 3 (highest) relative to the month's peak day
function spendLevel(amount, highestDay) {
  if (amount <= 0 || highestDay <= 0) return 0;
  const ratio = amount / highestDay;
  if (ratio > 0.66) return 3;
  if (ratio > 0.33) return 2;
  return 1;
}

// ---------- Savings coach: get tips on demand ----------
document.getElementById('get-tips-btn').addEventListener('click', async () => {
  const container = document.getElementById('tips-content');
  container.innerHTML = '<p class="empty-state">Thinking about your spending...</p>';

  const res = await fetch(`${API_BASE}/savings-tips/${currentUserId}`);
  const data = await res.json();

  const tipsHtml = data.tips.map((tip) => `<div class="tip-item">${escapeHtml(tip)}</div>`).join('');
  const sourceNote =
    data.source === 'fallback'
      ? '<p class="tips-source">Showing rule-based tips (AI tips will appear once an API key is configured).</p>'
      : '<p class="tips-source">Generated by AI based on your spending.</p>';

  container.innerHTML = tipsHtml + sourceNote;
});

// ---------- Small helpers ----------
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}


// ---------- Type-to-log (AI fills the form, the user confirms) ----------
document.getElementById('quick-btn').addEventListener('click', async () => {
  const text = document.getElementById('quick-text').value.trim();
  const msg = document.getElementById('quick-msg');
  const btn = document.getElementById('quick-btn');
  if (!text) return;

  btn.disabled = true;
  msg.textContent = 'Reading your message...';
  try {
    const res = await fetch('/api/quick-log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUserId, text }),
    });
    const data = await res.json();
    if (!res.ok) {
      msg.textContent = data.error || 'Something went wrong.';
    } else {
      document.getElementById('txn-category').value = data.category;
      document.getElementById('txn-amount').value = data.amount;
      document.getElementById('txn-note').value = data.note;
      msg.textContent = 'Check the details below, then click Log Spend.';
      document.getElementById('quick-text').value = '';
    }
  } catch (e) {
    msg.textContent = 'Could not reach the AI. Please use the form below.';
  }
  btn.disabled = false;
});

// ---------- Boot ----------
(async function start() {
  await initUser();
  loadBudgetSummary();
  loadForecast();
  loadCalendar();
})();