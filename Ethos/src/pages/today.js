// src/pages/today.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import { readActiveTracks, getDayDoc, getLastDays } from "../lib/db.js";
import { getDayKeyNow, getPeriodKeysForDayKey } from "../lib/time.js";
import { getEntriesForTrackOnDay } from "../lib/db.js";

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

function progressText(track, agg, rollup) {
  const targetMode = track?.target?.mode;
  const targetVal = Number(track?.target?.value || 0);

  // choose current value:
  // - daily cadence: use today's agg
  // - weekly/monthly: use rollup computed from last days
  const cadence = track.cadence || "daily";
  const valObj = cadence === "daily" ? agg : rollup;

  if (!valObj) return targetVal ? `0 / ${targetVal}` : `—`;

  if (track.type === "COUNTER_INCREMENT") {
    const sum = Number(valObj.sum || 0);
    return targetVal ? `${sum} / ${targetVal}` : `${sum}`;
  }

  if (track.type === "NUMBER_REPLACE") {
    const v = valObj.value;
    return (v === 0 || v) ? `${v} ${track.unit || ""}`.trim() : `—`;
  }

  // BOOLEAN/TEXT/DROPDOWN typically count-based
  const c = Number(valObj.count || 0);
  if (targetVal) return `${c} / ${targetVal}`;
  return `${c}`;
}

function computeRollups(tracks, lastDays, wantedWeekKey, wantedMonthKey) {
  // rollups[trackId] = {count,sum,value,lastValue,done,preview}
  const rollups = {};
  for (const t of tracks) rollups[t.id] = null;

  // For weekly/monthly, sum counts/sums across those day docs
  for (const day of lastDays) {
    const wk = day?.period?.weekKey;
    const mk = day?.period?.monthKey;

    for (const t of tracks) {
      if (t.cadence === "weekly" && wk !== wantedWeekKey) continue;
      if (t.cadence === "monthly" && mk !== wantedMonthKey) continue;
      if (t.cadence === "daily") continue;

      const a = day?.tracks?.[t.id];
      if (!a) continue;

      if (!rollups[t.id]) rollups[t.id] = {};

      if (t.type === "COUNTER_INCREMENT") {
        rollups[t.id].sum = Number(rollups[t.id].sum || 0) + Number(a.sum || 0);
        rollups[t.id].count = Number(rollups[t.id].count || 0) + Number(a.count || 0);
      } else if (t.type === "NUMBER_REPLACE") {
        // for weekly/monthly number replace: show latest value in period
        // use lastAt to pick latest; since lastDays is sorted desc, first hit is newest
        if (rollups[t.id].value === undefined) rollups[t.id].value = a.value;
      } else {
        rollups[t.id].count = Number(rollups[t.id].count || 0) + Number(a.count || 0);
        // keep latest-ish extras (optional)
        if (rollups[t.id].preview === undefined && a.preview) rollups[t.id].preview = a.preview;
        if (rollups[t.id].lastValue === undefined && a.lastValue) rollups[t.id].lastValue = a.lastValue;
        if (rollups[t.id].done === undefined && a.done !== undefined) rollups[t.id].done = a.done;
      }
    }
  }

  return rollups;
}

function renderSummaryCard(track, agg, rollup, ctx) {
    const cadenceLabel =
      track.cadence === "daily" ? "Today" : track.cadence === "weekly" ? "This week" : "This month";
  
    const val = progressText(track, agg, rollup);
  
    const targetVal = Number(track?.target?.value || 0);
    const isTargetMet = (() => {
      if (!targetVal) return false;
      const src = track.cadence === "daily" ? agg : rollup;
      if (!src) return false;
  
      if (track.type === "COUNTER_INCREMENT") return Number(src.sum || 0) >= targetVal;
      if (track.type === "NUMBER_REPLACE") return false; // no "done" concept
      return Number(src.count || 0) >= targetVal;
    })();
  
    // Secondary content per type
    let secondaryHtml = "";
    let rightMini = "";
  
    if (track.type === "TEXT_APPEND") {
      const entries = ctx?.textEntriesByTrack?.[track.id] || [];
      // newest last (readable), but your query returns desc, so reverse
      const ordered = entries.slice().reverse();
      const texts = ordered.map((e) => (e.text || "").trim()).filter(Boolean);
      rightMini = texts.length ? `${texts.length} entries` : "No notes yet";
      secondaryHtml = renderBulletList(texts.map((t) => t));
    }
  
    if (track.type === "DROPDOWN_EVENT") {
      // show period timeline from day docs (one per day via lastValue)
      const items = (ctx?.periodEventsByTrack?.[track.id] || []);
      rightMini = items.length ? `Events: ${items.length}` : "No selection yet";
      secondaryHtml = renderBulletList(items);
    }
  
    if (track.type === "BOOLEAN" && track.config?.booleanMode === "done_only") {
      rightMini = agg?.done ? "Done" : "Not yet";
      // but only show "Done" on the right if it's done; no extra list
      secondaryHtml = "";
    }
  
    if (!rightMini) {
      // default hint line
      if (track.type === "NUMBER_REPLACE") {
        rightMini = (agg?.value === 0 || agg?.value) ? `${agg.value} ${track.unit || ""}`.trim() : "—";
      } else {
        rightMini = isTargetMet ? "Done" : "Not yet"; // ✅ FIX: only if target met
        if (!targetVal) rightMini = ""; // no target -> no done label
        if (track.type === "COUNTER_INCREMENT") rightMini = ""; // counter shows just the numbers
      }
    }
  
    return `
      <div class="card">
        <div class="row" style="justify-content:space-between;gap:12px;align-items:flex-start;">
          <div style="min-width:0;">
            <div class="card-title">${track.name}</div>
            <div class="mini muted">${cadenceLabel}${targetVal ? ` • Target ${targetVal}` : ""}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:700;">${val}</div>
            ${rightMini ? `<div class="mini muted">${rightMini}</div>` : ""}
          </div>
        </div>
  
        ${secondaryHtml ? `<div style="margin-top:10px;">${secondaryHtml}</div>` : ""}
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
      const timeZone = profile?.timeZone || profile?.preferences?.timeZone || "Asia/Kolkata";
      const dayKey = getDayKeyNow(timeZone);
      const { weekKey, monthKey } = getPeriodKeysForDayKey(dayKey);
  
      const tracks = await readActiveTracks(user.uid);
      const dayDoc = await getDayDoc(user.uid, dayKey);
  
      // last 31 days is enough for weekly/monthly rollups (and matches retention vibe)
      const lastDays = await getLastDays(user.uid, 31);
      const rollups = computeRollups(tracks, lastDays, weekKey, monthKey);
  
      // 1) TEXT_APPEND: fetch all text entries today per text track
      // (requires entries index: trackId ASC + createdAt DESC)
      const textEntriesByTrack = {};
      for (const t of tracks) {
        if (t.type !== "TEXT_APPEND") continue;
        // If you named this helper differently, replace it:
        // getEntriesForTrackOnDay(uid, dayKey, trackId, max)
        textEntriesByTrack[t.id] = await getEntriesForTrackOnDay(
          user.uid,
          dayKey,
          t.id,
          20
        );
      }
  
      // 2) DROPDOWN_EVENT: build period event list from lastDays (uses lastValue per day)
      const periodEventsByTrack = {};

      for (const t of tracks) {
        if (t.type !== "DROPDOWN_EVENT") continue;
        if (t.cadence === "daily") continue;

        const items = [];

        for (const day of lastDays) {
            if (t.cadence === "weekly" && day?.period?.weekKey !== weekKey) continue;
            if (t.cadence === "monthly" && day?.period?.monthKey !== monthKey) continue;

            const agg = day?.tracks?.[t.id];
            const c = Number(agg?.count || 0);
            if (!c) continue;

            // fetch entries for that day+track (limit to c or cap 20)
            const entries = await getEntriesForTrackOnDay(user.uid, day.dayKey, t.id, Math.min(30, c));

            // entries are newest-first; render chronological inside the day
            entries.slice().reverse().forEach((e) => {
            const opt = e?.optionIds?.[0];
            if (opt) items.push(`${day.dayKey}: ${opt}`);
            });
        }

        periodEventsByTrack[t.id] = items;
      }

  
      // Pass extra context into renderSummaryCard
      const ctx = { textEntriesByTrack, periodEventsByTrack };
  
      const cards = tracks.length
        ? tracks
            .map((t) =>
              renderSummaryCard(
                t,
                safeTrackAgg(dayDoc, t.id),
                rollups[t.id],
                ctx
              )
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
            <p class="muted" style="white-space:pre-wrap;">${e?.message || String(e)}</p>
            <button class="btn" onclick="location.reload()">Reload</button>
          </div>
        `,
      });
    }
  }
  