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

function renderBulletList(items) {
  if (!items || !items.length) return "";
  return `
    <div class="bullets">
      ${items.map((x) => `<div class="bullet">${x}</div>`).join("")}
    </div>
  `;
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
      // yearly: no yearKey stored yet -> behaves like within lastDays window

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

function renderSummaryCard(track, agg, rollup, ctx) {
  const cadence = track.cadence || "daily";
  const label = cadenceLabel(cadence);

  const targetVal = Number(track?.target?.value || 0);
  const src = cadence === "daily" ? agg : rollup;

  const optMap = track.type === "DROPDOWN_EVENT" ? optionLabelMap(track) : null;

  let primary = "—";
  let rightMini = "";
  let secondaryHtml = "";

  if (track.type === "COUNTER_INCREMENT") {
    const sum = Number(src?.sum || 0);
    primary = targetVal ? `${sum} / ${targetVal}` : `${sum}`;
    rightMini = targetVal ? `${label} • Target ${targetVal}` : label;
  }

  if (track.type === "BOOLEAN") {
    const done = Boolean(src?.done);
    primary = done ? "✓" : "—";
    rightMini = done ? "Done" : "Not yet";
  }

  if (track.type === "NUMBER_REPLACE") {
    const v = src?.value;
    primary =
      v === 0 || v ? `${v} ${track.unit || ""}`.trim() : "—";
    rightMini = label;
  }

  if (track.type === "TEXT_APPEND") {
    const entries = ctx?.textEntriesByTrack?.[track.id] || [];
    const texts = entries
      .slice()
      .map((e) => (e.text || "").trim())
      .filter(Boolean);

    const n = texts.length;
    primary = n ? `${n}` : "0";
    rightMini = n === 1 ? "1 entry" : `${n} entries`;

    const latest = texts[0];
    if (latest) {
      secondaryHtml = `
        <div class="mini muted" style="margin-top:10px;">
          ${esc(latest)}
        </div>
      `;
    }
  }

  if (track.type === "DROPDOWN_EVENT") {
    const count = Number(src?.count || 0);
    primary = targetVal ? `${count} / ${targetVal}` : `${count}`;
    rightMini = count
      ? cadence === "daily"
        ? "Selected"
        : "Events"
      : "No selection yet";

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

    if (labels.length) {
      secondaryHtml = `<div style="margin-top:10px;">${renderBulletList(
        labels.slice(0, 3).map(esc)
      )}</div>`;
      rightMini = cadence === "daily" ? labels[0] : `Events: ${labels.length}`;
    }
  }

  const leftMini = (() => {
    if (track.type === "COUNTER_INCREMENT")
      return `${label}${targetVal ? ` • Target ${targetVal}` : ""}`;
    if (track.type === "DROPDOWN_EVENT")
      return `${label}${targetVal ? ` • Target ${targetVal}` : ""}`;
    return label;
  })();

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start;">
        <div style="min-width:0;">
          <div class="card-title">${esc(track.name)}</div>
          <div class="mini muted">${leftMini}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700;">${esc(primary)}</div>
          ${rightMini ? `<div class="mini muted">${esc(rightMini)}</div>` : ""}
        </div>
      </div>
      ${secondaryHtml || ""}
    </div>
  `;
}

export async function todayPage({ user, profile }) {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Today",
    activeTab: "today",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  try {
    const timeZone =
      profile?.timeZone || profile?.preferences?.timeZone || "Asia/Kolkata";
    const dayKey = getDayKeyNow(timeZone);
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
        if (t.cadence === "monthly" && day?.period?.monthKey !== monthKey) continue;

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
            renderSummaryCard(t, safeTrackAgg(dayDoc, t.id), rollups[t.id], ctx)
          )
          .join("")
      : `<div class="card"><div class="muted">No active tracks yet. Add some in Settings → Manage Tracks.</div></div>`;

    root.innerHTML = Shell({
      title: "Today",
      activeTab: "today",
      content: `
        <div class="content">
          <div class="mini muted" style="margin:6px 0 14px;">${dayKey} • ${timeZone}</div>
          ${cards}
        </div>

        <button class="fab" id="goLog" title="Log for today">＋</button>
      `,
    });

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
