// src/lib/time.js

export function getDayKeyNow(timeZone) {
    return getDayKeyForDate(new Date(), timeZone);
  }
  
  export function getDayKeyForDate(date, timeZone) {
    const parts = getDatePartsInTimeZone(date, timeZone);
    return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`;
  }
  
  export function getPeriodKeysForDayKey(dayKey) {
    // dayKey = YYYY-MM-DD
    const [y, m, d] = dayKey.split("-").map(Number);
  
    // use UTC date representing that calendar day
    const utcDate = new Date(Date.UTC(y, m - 1, d));
  
    const weekKey = isoWeekKeyFromUTCDate(utcDate);
    const monthKey = `${y}-${pad2(m)}`;
  
    return { weekKey, monthKey };
  }
  
  export function getDatePartsInTimeZone(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(date).reduce((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    return {
      year: Number(parts.year),
      month: Number(parts.month),
      day: Number(parts.day),
    };
  }
  
  function isoWeekKeyFromUTCDate(d) {
    // ISO week, using UTC date
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = date.getUTCDay() || 7; // Mon=1..Sun=7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum); // Thursday
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    const yyyy = date.getUTCFullYear();
    return `${yyyy}-W${pad2(weekNo)}`;
  }
  
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  