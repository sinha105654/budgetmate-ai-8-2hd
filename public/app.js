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
});

// ---------- Load + render budget summary (progress bars) ----------
async function loadBudgetSummary() {
  const container = document.getElementById('budget-summary');
  const res = await fetch(`${API_BASE}/budget/summary/${currentUserId}`);
  const summary = await res.json();

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
            <span class="category-figures">$${cat.spent} / $${cat.budgetAmount}</span>
          </div>
          <div class="progress-track">
            <div class="progress-fill ${fillClass}" style="width: ${pct}%"></div>
          </div>
        </div>
      `;
    })
    .join('');
}

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

// ---------- Boot ----------
(async function start() {
  await initUser();
  loadBudgetSummary();
  loadForecast();
})();