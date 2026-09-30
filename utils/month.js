// One place that decides what "this month" means.
// Every part of the app uses this, so they always agree.

function getMonthRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth(); // 0 = January

  // 1st of the month at 00:00
  const start = new Date(year, month, 1, 0, 0, 0, 0);

  // Last day of the month at 23:59
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return {
    start,
    end,
    daysInMonth: end.getDate(), // e.g. 30 for September
    dayOfMonth: now.getDate(),  // e.g. 30 if today is the 30th
  };
}

module.exports = { getMonthRange };