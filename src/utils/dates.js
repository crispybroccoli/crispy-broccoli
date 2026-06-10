export function toDateInputValue(date = new Date()) {
  const copy = new Date(date);
  copy.setMinutes(copy.getMinutes() - copy.getTimezoneOffset());
  return copy.toISOString().slice(0, 10);
}

export function addDaysToIso(isoDate, days) {
  const date = isoDate ? new Date(`${isoDate}T12:00:00`) : new Date();
  date.setDate(date.getDate() + Number(days || 0));
  return toDateInputValue(date);
}

export function daysUntil(isoDate) {
  if (!isoDate) return 9999;
  const today = new Date(`${toDateInputValue()}T00:00:00`);
  const due = new Date(`${isoDate}T00:00:00`);
  return Math.ceil((due - today) / 86400000);
}
