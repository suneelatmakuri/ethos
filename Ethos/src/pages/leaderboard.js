// src/pages/leaderboard.js

import { Shell } from "../components/shell.js";

import {
  getUserProfile,
  readAllTracks,
  getLastDays,
  getDayDoc,
  computeNormalizedKey,
} from "../lib/db.js";

import { getDayKeyNow, getPeriodKeysForDayKey } from "../lib/time.js";

import {
  LEADERBOARD_PRIORITY,
  LEADERBOARD_EXCLUDED_TYPES,
} from "../config/ethosLeaderboardConfig.js";

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

const LB_ACCENT_CLASSES = [
  "lb-acc1",
  "lb-acc2",
  "lb-acc3",
  "lb-acc4",
  "lb-acc5",
  "lb-acc6",
  "lb-acc7",
  "lb-acc8",
  "lb-acc9",
];

function pickAccentClassRandom() {
  return (
    LB_ACCENT_CLASSES[Math.floor(Math.random() * LB_ACCENT_CLASSES.length)] ||
    "lb-acc1"
  );
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getUserTimeZone(profile) {
  return profile?.preferences?.timeZone || profile?.timeZone || "Asia/Kolkata";
}

function isEligibleTrack(track) {
  if (!track) return false;
  if (!track.isActive) return false;
  if (track.isPrivate) return false;
  if (LEADERBOARD_EXCLUDED_TYPES?.has?.(track.type)) return false;
  // belt + suspenders
  if (track.type === "NUMBER_REPLACE") return false;
  return true;
}

function normalizeLooseText(v) {
  return String(v ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function stableStringify(obj) {
  if (Array.isArray(obj)) return `[${obj.map(stableStringify).join(",")}]`;
  if (obj && typeof obj === "object") {
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(obj);
}

/**
 * comparableKey groups tracks across users.
 * - ignore: cadence, target, config
 * - match on: name, type, unit
 */
function comparableKeyFromNormalizedKeyString(normalizedKeyStr) {
  if (!normalizedKeyStr) return null;
  try {
    const obj = JSON.parse(normalizedKeyStr);
    const base = {
      name: normalizeLooseText(obj?.name),
      type: String(obj?.type ?? ""),
      unit: normalizeLooseText(obj?.unit),
    };
    return stableStringify(base);
  } catch {
    return null;
  }
}

function getNormalizedKeyString(track) {
  // Preferred: stored meta.normalizedKey
  const raw = track?.meta?.normalizedKey;
  if (typeof raw === "string" && raw.trim()) return raw;

  // Fallback: derive
  return computeNormalizedKey({
    name: track?.name,
    type: track?.type,
    unit: track?.unit,
    cadence: track?.cadence,
    target: track?.target ?? null,
    config: track?.config ?? {},
  });
}

function labelForTrack(track) {
  if (!track) return "";
  if (track.type === "COUNTER_INCREMENT") return String(track.unit || "").trim();
  if (track.type === "TEXT_APPEND") return "entries";
  if (track.type === "DROPDOWN_EVENT") return "events";
  if (track.type === "BOOLEAN") return "done";
  return "";
}

function valueFromDayAgg(track, agg) {
  if (!agg || !track) return 0;

  if (track.type === "COUNTER_INCREMENT") return safeNum(agg.sum ?? agg.value);

  if (track.type === "BOOLEAN") {
    // count-mode boolean uses sum; done-only uses done
    if (agg.sum !== undefined) return safeNum(agg.sum);
    return agg.done === true ? 1 : 0;
  }

  if (track.type === "TEXT_APPEND") return safeNum(agg.count);
  if (track.type === "DROPDOWN_EVENT") return safeNum(agg.count);

  return 0;
}

function computePeriodTotal(
  track,
  days,
  wantedDayKey,
  wantedWeekKey,
  wantedMonthKey,
  period
) {
  if (!track) return 0;

  if (period === "today") {
    const d = (days || []).find((x) => x?.id === wantedDayKey);
    const agg = d?.tracks?.[track.id];
    return valueFromDayAgg(track, agg);
  }

  let total = 0;
  for (const d of days || []) {
    const dk = d?.id;
    if (!dk) continue;
    const p = d?.period || getPeriodKeysForDayKey(dk);
    if (period === "week" && p.weekKey !== wantedWeekKey) continue;
    if (period === "month" && p.monthKey !== wantedMonthKey) continue;
    total += valueFromDayAgg(track, d?.tracks?.[track.id]);
  }
  return total;
}

function renderTabs(activeKey) {
  return `
    <div class="lb-tabs" role="tablist" aria-label="Leaderboard period">
      ${PERIODS.map(
        (p) => `
          <button
            type="button"
            class="lb-tab ${p.key === activeKey ? "active" : ""}"
            data-period="${p.key}"
            role="tab"
            aria-selected="${p.key === activeKey ? "true" : "false"}">
            ${p.label}
          </button>
        `
      ).join("")}
    </div>
  `;
}

function renderEmpty() {
  return `
    <div class="lb-empty">
      No shared tracks yet.
      <div class="lb-emptySub">Add a track and ask a friend to enable the same one.</div>
    </div>
  `;
}

function sortRowsForViewer(rows, viewerUid, nameMap) {
  return [...rows].sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;

    // viewer gets moral priority within ties
    if (a.uid === viewerUid && b.uid !== viewerUid) return -1;
    if (b.uid === viewerUid && a.uid !== viewerUid) return 1;

    const an = (nameMap[a.uid] || "").toLowerCase();
    const bn = (nameMap[b.uid] || "").toLowerCase();
    return an.localeCompare(bn);
  });
}

function orderGroupKeys(groups, myTrackByKey) {
  const wanted = [];

  // priority first
  for (const p of LEADERBOARD_PRIORITY || []) {
    const ck = comparableKeyFromNormalizedKeyString(p?.normalizedKey);
    if (ck && groups[ck] && myTrackByKey[ck]) wanted.push(ck);
  }

  // remaining alphabetical by my track name
  const rest = Object.keys(groups)
    .filter((k) => !wanted.includes(k))
    .sort((a, b) => {
      const an = String(myTrackByKey[a]?.name || "");
      const bn = String(myTrackByKey[b]?.name || "");
      return an.localeCompare(bn);
    });

  return [...wanted, ...rest];
}

function buildSectionsHtml(groups, orderedKeys, viewerUid, nameMap, period) {
  if (!orderedKeys.length) return renderEmpty();

  return `
    <div class="lb-list" data-period="${esc(period)}">
      ${orderedKeys
        .map((key) => {
          const g = groups[key];
          if (!g) return "";
          const track = g.track;
          const rows = sortRowsForViewer(g.rows, viewerUid, nameMap);
          const winnerUid = rows[0]?.uid;
          const accentClass = pickAccentClassRandom();
          const unitLabel = esc(labelForTrack(track) || "");

          return `
            <section class="lb-section ${accentClass}">
              <div class="lb-header">
                <div class="lb-title">${esc(track?.name || "")}</div>
                <div class="lb-divider"></div>
                <div class="lb-unit">${unitLabel}</div>
              </div>

              <div class="lb-rows">
                ${rows
                  .map((r, idx) => {
                    const nm = r.uid === viewerUid ? "You" : nameMap[r.uid] || "Friend";
                    const isWinner = r.uid === winnerUid;
                    const rowCls = `lb-row ${isWinner ? "leader" : ""}`;
                    const rank = idx + 1;
                    return `
                      <div class="${rowCls}">
                        <div class="lb-left">
                          <div class="lb-rank">${rank}</div>
                          <div class="lb-name">${esc(nm)}</div>
                        </div>
                        <div class="lb-val">${esc(r.value)}</div>
                      </div>
                    `;
                  })
                  .join("")}
              </div>
            </section>
          `;
        })
        .join("")}
    </div>
  `;
}

async function loadUserBundle(uid) {
  const profile = await getUserProfile(uid);
  const tz = getUserTimeZone(profile);

  const tracks = await readAllTracks(uid);
  const eligibleTracks = (tracks || []).filter(isEligibleTrack);

  // days cache
  const todayKey = getDayKeyNow(tz);
  const days = await getLastDays(uid, 45);
  const hasToday = (days || []).some((d) => d?.id === todayKey);
  if (!hasToday) {
    const todayDoc = await getDayDoc(uid, todayKey);
    if (todayDoc) days.unshift({ id: todayKey, ...todayDoc });
  }

  const { weekKey, monthKey } = getPeriodKeysForDayKey(todayKey);

  return {
    uid,
    profile,
    tz,
    todayKey,
    weekKey,
    monthKey,
    tracks: eligibleTracks,
    days,
  };
}

function indexTracksByComparableKey(tracks) {
  const index = {};
  for (const t of tracks || []) {
    const nk = getNormalizedKeyString(t);
    const ck = comparableKeyFromNormalizedKeyString(nk);
    if (!ck) continue;
    if (!index[ck]) index[ck] = t;
  }
  return index;
}

function buildGroups(myIndex, friendIndexes, bundlesByUid, viewerUid, period) {
  const groups = {};

  for (const [ck, myTrack] of Object.entries(myIndex)) {
    const participants = [];

    // me
    const myBundle = bundlesByUid[viewerUid];
    const myTotal = computePeriodTotal(
      myTrack,
      myBundle.days,
      myBundle.todayKey,
      myBundle.weekKey,
      myBundle.monthKey,
      period
    );
    participants.push({ uid: viewerUid, value: myTotal });

    // friends
    let hasFriend = false;
    for (const fUid of Object.keys(friendIndexes)) {
      const t = friendIndexes[fUid]?.[ck];
      if (!t) continue;
      hasFriend = true;
      const b = bundlesByUid[fUid];
      const total = computePeriodTotal(t, b.days, b.todayKey, b.weekKey, b.monthKey, period);
      participants.push({ uid: fUid, value: total });
    }

    if (!hasFriend) continue;
    groups[ck] = { track: myTrack, rows: participants };
  }

  return groups;
}

/**
 * Router passes a single object (often called ctx) to page functions.
 * We accept it as ctx but only care about ctx.user + ctx.profile.
 */
export async function leaderboardPage(ctx) {
  const { user, profile } = ctx || {};
  const root = document.getElementById("app");

  // Ensure leaderboard has its own background (no carry-over from Home).
  document.body.classList.add("lb-bg");
  document.body.classList.remove("home-bg");

  // initial scaffold
  root.innerHTML = Shell({
    title: "Leaderboard",
    activeTab: "leaderboard",
    content: `
      <div class="lb-wrap">
        ${renderTabs("today")}
        <div class="lb-body">
          <div class="lb-loading">Loading…</div>
        </div>
      </div>
    `,
  });

  const viewerUid = user?.uid;
  if (!viewerUid) {
    root.querySelector(".lb-body").innerHTML = renderEmpty();
    return;
  }

  const meProfile = profile || (await getUserProfile(viewerUid));
  const friendUids = Array.from(new Set((meProfile?.friends || []).filter(Boolean)));
  const allUids = [viewerUid, ...friendUids];

  // Load bundles in parallel (small friend list; ok)
  const bundles = await Promise.all(allUids.map(loadUserBundle));
  const bundlesByUid = {};
  for (const b of bundles) bundlesByUid[b.uid] = b;

  // Name map from /users/{uid}.displayName
  const nameMap = {};
  for (const uid of allUids) {
    const p = bundlesByUid[uid]?.profile;
    nameMap[uid] = p?.displayName || "Friend";
  }

  const myIndex = indexTracksByComparableKey(bundlesByUid[viewerUid].tracks);
  const friendIndexes = {};
  for (const fUid of friendUids) {
    friendIndexes[fUid] = indexTracksByComparableKey(bundlesByUid[fUid].tracks);
  }

  const myTrackByKey = myIndex;

  function renderPeriod(period) {
    const groups = buildGroups(myIndex, friendIndexes, bundlesByUid, viewerUid, period);
    const orderedKeys = orderGroupKeys(groups, myTrackByKey);

    const body = root.querySelector(".lb-body");
    body.innerHTML = buildSectionsHtml(groups, orderedKeys, viewerUid, nameMap, period);
  }

  // Initial render
  renderPeriod("today");

  // Tab click handlers
  const tabWrap = root.querySelector(".lb-tabs");
  tabWrap?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("button[data-period]");
    if (!btn) return;
    const p = btn.dataset.period;
    if (!p) return;

    // Update active styles
    tabWrap.querySelectorAll(".lb-tab").forEach((b) => {
      const isActive = b.dataset.period === p;
      b.classList.toggle("active", isActive);
      b.setAttribute("aria-selected", isActive ? "true" : "false");
    });

    renderPeriod(p);
  });
}