// src/pages/today.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import {
  readActiveTracks,
  getDayDoc,
  getLastDays,
  getEntriesForTrackOnDay,
} from "../lib/db.js";
import { getDayKeyNow, getPeriodKeysForDayKey } from "../lib/time.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeTrackAgg(dayDoc, trackId) {
  return dayDoc?.tracks?.[trackId] || null;
}

function cadenceLabel(cadence) {
  if (cadence === "weekly") return "This week";
  if (cadence === "monthly") return "This month";
  if (cadence === "yearly") return "This year";
  return "Today";
}

// Handles old-ish stored ids like "2026-01-26:9fmfn8"
function normalizeChoiceId(id) {
  if (typeof id !== "string") return id;
  const m = id.match(/^(\d{4}-\d{2}-\d{2}):(.+)$/);
  return m ? m[2] : id;
}

function optionLabelMap(track) {
  const opts = Array.isArray(track?.config?.options) ? track.config.options : [];
  const map = {};
  for (const o of opts) map[o.id] = o.label;
  return map;
}

function computeRollups(tracks, lastDays, wantedWeekKey, wantedMonthKey) {
  const rollups = {};
  for (const t of tracks) rollups[t.id] = null;

  for (const day of lastDays) {
    const wk = day?.period?.weekKey;
    const mk = day?.period?.monthKey;

    for (const t of tracks) {
      if (t.cadence === "daily") continue;

      if (t.cadence === "weekly" && wk !== wantedWeekKey) continue;
      if (t.cadence === "monthly" && mk !== wantedMonthKey) continue;

      const a = day?.tracks?.[t.id];
      if (!a) continue;

      if (!rollups[t.id]) rollups[t.id] = {};

      if (t.type === "COUNTER_INCREMENT") {
        rollups[t.id].sum = Number(rollups[t.id].sum || 0) + Number(a.sum || 0);
        rollups[t.id].count =
          Number(rollups[t.id].count || 0) + Number(a.count || 0);
        continue;
      }

      if (t.type === "NUMBER_REPLACE") {
        if (rollups[t.id].value === undefined) rollups[t.id].value = a.value;
        continue;
      }

      if (t.type === "BOOLEAN") {
        rollups[t.id].done = Boolean(rollups[t.id].done) || Boolean(a.done);
        rollups[t.id].count =
          Number(rollups[t.id].count || 0) + Number(a.count || 0);
        continue;
      }

      // TEXT_APPEND / DROPDOWN_EVENT
      rollups[t.id].count =
        Number(rollups[t.id].count || 0) + Number(a.count || 0);
      if (rollups[t.id].preview === undefined && a.preview)
        rollups[t.id].preview = a.preview;
      if (rollups[t.id].lastValue === undefined && a.lastValue)
        rollups[t.id].lastValue = a.lastValue;
    }
  }

  return rollups;
}

function parseDayKeyToUTCDate(dayKey) {
  // dayKey: YYYY-MM-DD
  const [y, m, d] = String(dayKey).split("-").map((x) => Number(x));
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

function formatPrettyDate(dayKey, timeZone) {
  const dt = parseDayKeyToUTCDate(dayKey);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone,
  }).format(dt);
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

function pickGradientClass() {
  const n = 9; // td-g1..td-g9
  const idx = 1 + Math.floor(Math.random() * n);
  return `td-g${idx}`;
}

function computeCardModel(track, agg, rollup, ctx) {
  const cadence = track.cadence || "daily";
  const label = cadenceLabel(cadence);

  const targetVal = Number(track?.target?.value || 0);
  const unit = (track.unit || "").trim();

  const src = cadence === "daily" ? agg : rollup;

  let valueMain = "—";
  let valueSub = ""; // unit text OR "events"/"entries"
  let pct = 0;
  let extraLines = [];

  if (track.type === "COUNTER_INCREMENT") {
    const sum = Number(src?.sum || 0);
    valueMain = targetVal ? `${sum} / ${targetVal}` : `${sum}`;
    valueSub = unit || "";
    pct = targetVal ? clamp01(sum / targetVal) : sum > 0 ? 1 : 0;
  }

  if (track.type === "BOOLEAN") {
    const done = Boolean(src?.done);
    valueMain = done ? "✓" : "—";
    valueSub = done ? "Done" : "Not yet";
    pct = done ? 1 : 0;
  }

  if (track.type === "NUMBER_REPLACE") {
    // still render it on Today page; leaderboard excludes it, but Today can show it.
    const v = src?.value;
    valueMain = v === 0 || v ? `${v}` : "—";
    valueSub = unit || "";
    pct = v === 0 || v ? 1 : 0;
  }

  if (track.type === "TEXT_APPEND") {
    const entries = ctx?.textEntriesByTrack?.[track.id] || [];
    const texts = entries
      .slice()
      .map((e) => (e.text || "").trim())
      .filter(Boolean);

    const n = texts.length;
    valueMain = `${n}`;
    valueSub = n === 1 ? "entry" : "entries";
    pct = n > 0 ? 1 : 0;

    const latest = texts[0];
    if (latest) extraLines.push(latest);
  }

  if (track.type === "DROPDOWN_EVENT") {
    const optMap = optionLabelMap(track);

    const count = Number(src?.count || 0);
    valueMain = targetVal ? `${count} / ${targetVal}` : `${count}`;
    valueSub = "events";
    pct = targetVal ? clamp01(count / targetVal) : count > 0 ? 1 : 0;

    let labels = [];
    if (cadence === "daily") {
      const lv = Array.isArray(agg?.lastValue) ? agg.lastValue : [];
      labels = lv
        .map((raw) => normalizeChoiceId(raw))
        .map((id) => optMap?.[id] || id)
        .filter(Boolean);
    } else {
      labels = (ctx?.periodEventsByTrack?.[track.id] || [])
        .map((raw) => normalizeChoiceId(raw))
        .map((id) => optMap?.[id] || id)
        .filter(Boolean);
    }

    // plain text, no pills
    if (labels.length) {
      extraLines = labels.slice(0, 3);
    }
  }

  return {
    title: track.name || "Untitled",
    cadenceLabel: label,
    valueMain,
    valueSub,
    pct,
    extraLines,
  };
}

function renderTodayCard(track, agg, rollup, ctx) {
  const model = computeCardModel(track, agg, rollup, ctx);
  const g = pickGradientClass();

  // store pct for animation; start at 0 in CSS, then JS will set width to pct%
  const pct100 = Math.round(model.pct * 100);

  const extra =
    model.extraLines && model.extraLines.length
      ? `<div class="td-extra">
          ${model.extraLines.map((t) => `<div class="td-extraLine">${esc(t)}</div>`).join("")}
        </div>`
      : "";

  return `
    <div class="td-card ${g}" data-pct="${pct100}">
      <div class="td-fill" aria-hidden="true"></div>

      <div class="td-top">
        <div class="td-left">
          <div class="td-title">${esc(model.title)}</div>
          <div class="td-cadence">${esc(model.cadenceLabel)}</div>
        </div>

        <div class="td-right">
          <div class="td-value">${esc(model.valueMain)}</div>
          ${model.valueSub ? `<div class="td-unit">${esc(model.valueSub)}</div>` : ""}
        </div>
      </div>

      ${extra}
    </div>
  `;
}

function applyTodayBodyBg() {
  // Ensure Today doesn't inherit Home bg.
  document.body.classList.remove("home-bg");
  document.body.classList.remove("leaderboard-bg"); // harmless if not present
  document.body.classList.add("today-bg");
}

function animateCardFills(rootEl) {
  const cards = Array.from(rootEl.querySelectorAll(".td-card"));
  requestAnimationFrame(() => {
    for (const c of cards) {
      const pct = Number(c.getAttribute("data-pct") || 0);
      const fill = c.querySelector(".td-fill");
      if (fill) fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
    }
  });
}

export async function todayPage({ user, profile }) {
  const root = document.getElementById("app");

  applyTodayBodyBg();

  root.innerHTML = Shell({
    title: "Today",
    activeTab: "today",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  try {
    const timeZone =
      profile?.timeZone || profile?.preferences?.timeZone || "Asia/Kolkata";
    const dayKey = getDayKeyNow(timeZone);
    const prettyDate = formatPrettyDate(dayKey, timeZone);

    const { weekKey, monthKey } = getPeriodKeysForDayKey(dayKey);

    const tracks = await readActiveTracks(user.uid);
    const dayDoc = await getDayDoc(user.uid, dayKey);

    const lastDays = await getLastDays(user.uid, 31);
    const rollups = computeRollups(tracks, lastDays, weekKey, monthKey);

    const textEntriesByTrack = {};
    for (const t of tracks) {
      if (t.type !== "TEXT_APPEND") continue;
      textEntriesByTrack[t.id] = await getEntriesForTrackOnDay(
        user.uid,
        dayKey,
        t.id,
        20
      );
    }

    const periodEventsByTrack = {};
    for (const t of tracks) {
      if (t.type !== "DROPDOWN_EVENT") continue;
      if (t.cadence === "daily") continue;

      const ids = [];
      for (const day of lastDays) {
        if (t.cadence === "weekly" && day?.period?.weekKey !== weekKey) continue;
        if (t.cadence === "monthly" && day?.period?.monthKey !== monthKey)
          continue;

        const a = day?.tracks?.[t.id];
        const c = Number(a?.count || 0);
        if (!c) continue;

        const entries = await getEntriesForTrackOnDay(
          user.uid,
          day.dayKey,
          t.id,
          Math.min(30, c)
        );
        for (const e of entries) {
          const opt = e?.optionIds?.[0];
          if (opt) ids.push(opt);
        }
      }
      periodEventsByTrack[t.id] = ids;
    }

    const ctx = { textEntriesByTrack, periodEventsByTrack };

    const cards = tracks.length
      ? tracks
          .map((t) =>
            renderTodayCard(t, safeTrackAgg(dayDoc, t.id), rollups[t.id], ctx)
          )
          .join("")
      : `<div class="td-empty">No active tracks yet. Add some in Settings → Manage Tracks.</div>`;

    root.innerHTML = Shell({
      title: "Today",
      activeTab: "today",
      content: `
        <div class="td-page">
          <div class="td-date">${esc(prettyDate)}</div>
          <div class="td-list">${cards}</div>
        </div>

        <button class="fab" id="goLog" title="Log for today">＋</button>
      `,
    });

    // animate fills after DOM paint
    animateCardFills(root);

    root.querySelector("#goLog").addEventListener("click", () => {
      navigate("#/today/log");
    });
  } catch (e) {
    console.error("Today page load failed:", e);
    root.innerHTML = Shell({
      title: "Today",
      activeTab: "today",
      content: `
        <div class="center">
          <h2 style="margin:0 0 10px;">Couldn’t load Today</h2>
          <p class="muted" style="white-space:pre-wrap;">${esc(
            e?.message || String(e)
          )}</p>
          <button class="btn" onclick="location.reload()">Reload</button>
        </div>
      `,
    });
  }
}
