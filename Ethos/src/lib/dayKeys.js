// src/lib/dayKeys.js

function pad2(n) {
    return String(n).padStart(2, "0");
  }
  
  // Returns { y, m, d } for "now" in a given IANA timeZone
  function partsInTZ(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return { y: Number(get("year")), m: Number(get("month")), d: Number(get("day")) };
  }
  
  export function dayKeyFor(date, timeZone) {
    const { y, m, d } = partsInTZ(date, timeZone);
    return `${y}-${pad2(m)}-${pad2(d)}`; // YYYY-MM-DD
  }
  
  export function monthKeyFromDayKey(dayKey) {
    return dayKey.slice(0, 7); // YYYY-MM
  }
  
  // ISO week key: YYYY-Www (weeks start Monday)
  export function isoWeekKeyFromDayKey(dayKey) {
    // Parse as UTC midnight to avoid local timezone side-effects
    const [Y, M, D] = dayKey.split("-").map(Number);
    const date = new Date(Date.UTC(Y, M - 1, D));
  
    // ISO: Thursday decides the year
    const day = date.getUTCDay() || 7; // Mon=1..Sun=7
    date.setUTCDate(date.getUTCDate() + (4 - day));
  
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  
    return `${date.getUTCFullYear()}-W${pad2(weekNo)}`;
  }
  
  // Add/subtract days from a dayKey safely
  export function shiftDayKey(dayKey, deltaDays) {
    const [Y, M, D] = dayKey.split("-").map(Number);
    const date = new Date(Date.UTC(Y, M - 1, D));
    date.setUTCDate(date.getUTCDate() + deltaDays);
    const y = date.getUTCFullYear();
    const m = date.getUTCMonth() + 1;
    const d = date.getUTCDate();
    return `${y}-${pad2(m)}-${pad2(d)}`;
  }
  