// src/pages/todayLog.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import { readActiveTracks, getDayDoc } from "../lib/db.js";
import { getDayKeyNow, getPeriodKeysForDayKey } from "../lib/time.js";

import {
  writeBatch,
  doc,
  collection,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../lib/firebase.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDayKeyPretty(dayKey, timeZone) {
  // dayKey: "YYYY-MM-DD"
  // Use a stable noon UTC anchor to avoid date shifting around DST edges.
  const d = new Date(`${dayKey}T12:00:00.000Z`);
  try {
    return new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: timeZone || "Asia/Kolkata",
    }).format(d);
  } catch {
    return dayKey;
  }
}

function setTodayLogBodyBg() {
  // Ensure todayLog has its own background and does not inherit home.
  document.body.classList.remove("home-bg", "lb-bg", "today-bg", "auth-bg", "welcome-mode");
  document.body.classList.add("todaylog-bg");
}

export async function todayLogPage({ user, profile }) {
  setTodayLogBodyBg();

  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Log",
    activeTab: "today",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  const timeZone = profile?.timeZone || profile?.preferences?.timeZone || "Asia/Kolkata";
  const dayKey = getDayKeyNow(timeZone);
  const prettyDate = formatDayKeyPretty(dayKey, timeZone);
  const { weekKey, monthKey } = getPeriodKeysForDayKey(dayKey);

  try {
    const tracks = await readActiveTracks(user.uid);
    const dayDoc = await getDayDoc(user.uid, dayKey);

    const form = tracks
      .map((t) => {
        const agg = dayDoc?.tracks?.[t.id] || null;

        // Helper: "today: X unit" (right side)
        const unit = esc(t.unit || "");
        const rightMeta = (txt) => `<div class="tlog-rightMeta">${esc(txt)}</div>`;

        // TEXT_APPEND
        if (t.type === "TEXT_APPEND") {
          const count = agg?.count || 0;
          return `
            <div class="tlog-card">
              <div class="tlog-head">
                <div class="tlog-title">${esc(t.name)}</div>
                ${rightMeta(`today: ${count} ${count === 1 ? "entry" : "entries"}`)}
              </div>

              <textarea class="tlog-textarea"
                rows="2"
                data-track="${t.id}" data-type="TEXT_APPEND"
                placeholder="Write a quick note…"></textarea>
            </div>
          `;
        }

        // NUMBER_REPLACE
        if (t.type === "NUMBER_REPLACE") {
          const current = (agg?.value === 0 || agg?.value) ? agg.value : "—";
          return `
            <div class="tlog-card">
              <div class="tlog-head">
                <div class="tlog-title">${esc(t.name)}</div>
                ${rightMeta(`today: ${esc(current)} ${unit}`)}
              </div>

              <input class="tlog-input"
                inputmode="decimal"
                type="text"
                data-track="${t.id}" data-type="NUMBER_REPLACE"
                placeholder="Enter value"
                value="" />
            </div>
          `;
        }

        // DROPDOWN_EVENT
        if (t.type === "DROPDOWN_EVENT") {
          const count = agg?.count || 0;
          const options = Array.isArray(t.config?.options) ? t.config.options : [];
          const opts = options
            .map((o) => `<option value="${esc(o.id)}">${esc(o.label)}</option>`)
            .join("");

          return `
            <div class="tlog-card">
              <div class="tlog-head">
                <div class="tlog-title">${esc(t.name)}</div>
                ${rightMeta(`today: ${count} ${count === 1 ? "event" : "events"}`)}
              </div>

              <select class="tlog-select" data-track="${t.id}" data-type="DROPDOWN_EVENT">
                <option value="">Select…</option>
                ${opts}
              </select>
            </div>
          `;
        }

        // COUNTER_INCREMENT (new layout)
        if (t.type === "COUNTER_INCREMENT") {
          const step = Number(t.config?.incrementStep || 1);
          const currentSum = agg?.sum || 0;

          return `
            <div class="tlog-card">
              <div class="tlog-head">
                <div class="tlog-title">${esc(t.name)}</div>
                ${rightMeta(`today: ${esc(currentSum)} ${unit}`)}
              </div>

              <div class="tlog-counter">
                <button class="tlog-roundBtn" type="button" data-counter-dec="${t.id}" aria-label="Decrease">−</button>

                <input class="tlog-counterInput"
                  inputmode="numeric"
                  type="text"
                  data-track="${t.id}" data-type="COUNTER_INCREMENT"
                  data-step="${step}"
                  value="0" />

                <button class="tlog-roundBtn" type="button" data-counter-inc="${t.id}" aria-label="Increase">+</button>
              </div>
            </div>
          `;
        }

        // BOOLEAN
        if (t.type === "BOOLEAN") {
          const mode = t.config?.booleanMode || "done_only";
          if (mode === "done_only") {
            const checked = agg?.done ? "checked" : "";
            const state = agg?.done ? "true" : "false";

            return `
              <div class="tlog-card">
                <div class="tlog-head">
                  <div class="tlog-title">${esc(t.name)}</div>

                  <label class="tlog-checkWrap" aria-label="Done today">
                    <input
                      class="tlog-checkInput"
                      type="checkbox"
                      data-track="${t.id}" data-type="BOOLEAN_DONE"
                      ${checked}
                      aria-checked="${state}"
                    />
                    <span class="tlog-checkUI" aria-hidden="true"></span>
                  </label>
                </div>
              </div>
            `;
          }

          // count mode (legacy)
          const count = agg?.count || 0;
          return `
            <div class="tlog-card">
              <div class="tlog-head">
                <div class="tlog-title">${esc(t.name)}</div>
                ${rightMeta(`today: ${count}`)}
              </div>

              <input class="tlog-input" type="number" min="0" step="1"
                data-track="${t.id}" data-type="BOOLEAN_COUNT"
                placeholder="Add count (e.g. 1)" />
            </div>
          `;
        }

        return "";
      })
      .join("");

    root.innerHTML = Shell({
      title: "Log",
      activeTab: "today",
      content: `
        <div class="tlog-wrap">
          <div class="tlog-top">
            <button class="tlog-back" id="back" type="button" aria-label="Back">← Back</button>
            <div class="tlog-date">${esc(prettyDate)}</div>
            <div class="tlog-topSpacer"></div>
          </div>

          <div class="tlog-list">
            ${form || `<div class="tlog-empty">No active tracks yet.</div>`}
          </div>

          <div class="tlog-saveBar">
            <button class="tlog-save" id="submit" type="button">Save</button>
            <div class="tlog-status" id="status"></div>
          </div>
        </div>
      `,
    });

    root.querySelector("#back").addEventListener("click", () => navigate("#/today"));

    // Counter +/- bindings (same logic, but input now defaults to 0)
    root.querySelectorAll("[data-counter-inc]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const trackId = btn.dataset.counterInc;
        const input = root.querySelector(
          `input[data-track="${trackId}"][data-type="COUNTER_INCREMENT"]`
        );
        if (!input) return;

        const step = Number(input.dataset.step || 1);
        const current = Number(String(input.value || "").trim() || 0);
        input.value = String(current + step);
      });
    });

    root.querySelectorAll("[data-counter-dec]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const trackId = btn.dataset.counterDec;
        const input = root.querySelector(
          `input[data-track="${trackId}"][data-type="COUNTER_INCREMENT"]`
        );
        if (!input) return;

        const step = Number(input.dataset.step || 1);
        const current = Number(String(input.value || "").trim() || 0);
        input.value = String(Math.max(0, current - step));
      });
    });

    root.querySelector("#submit").addEventListener("click", async () => {
      const status = root.querySelector("#status");
      status.textContent = "Saving…";

      const batch = writeBatch(db);

      const dayRef = doc(db, "users", user.uid, "days", dayKey);
      batch.set(
        dayRef,
        {
          dayKey,
          timeZone,
          period: { weekKey, monthKey },
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const entriesRef = collection(db, "users", user.uid, "days", dayKey, "entries");
      const inputs = Array.from(root.querySelectorAll("[data-track][data-type]"));

      let writes = 0;

      for (const el of inputs) {
        const trackId = el.dataset.track;
        const type = el.dataset.type;

        // TEXT_APPEND
        if (type === "TEXT_APPEND") {
          const text = el.value.trim();
          if (!text) continue;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "TEXT_APPEND",
            text,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "TEXT_APPEND",
                  count: increment(1),
                  preview: text.slice(0, 80),
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }

        // NUMBER_REPLACE
        if (type === "NUMBER_REPLACE") {
          const v = el.value.trim();
          if (v === "") continue;

          const value = Number(v);
          if (Number.isNaN(value)) continue;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "NUMBER_REPLACE",
            value,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "NUMBER_REPLACE",
                  value,
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }

        // COUNTER_INCREMENT (delta)
        if (type === "COUNTER_INCREMENT") {
          const v = String(el.value || "").trim();
          if (v === "") continue;

          const deltaValue = Number(v);
          if (!deltaValue || Number.isNaN(deltaValue)) continue;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "COUNTER_INCREMENT",
            deltaValue,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "COUNTER_INCREMENT",
                  count: increment(1),
                  sum: increment(deltaValue),
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }

        // DROPDOWN_EVENT
        if (type === "DROPDOWN_EVENT") {
          const optionId = el.value;
          if (!optionId) continue;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "DROPDOWN_EVENT",
            optionIds: [optionId],
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "DROPDOWN_EVENT",
                  count: increment(1),
                  lastValue: [optionId],
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }

        // BOOLEAN_DONE
        if (type === "BOOLEAN_DONE") {
          const value = !!el.checked;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "BOOLEAN",
            value,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "BOOLEAN",
                  done: value,
                  count: value ? 1 : 0,
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }

        // BOOLEAN_COUNT (legacy)
        if (type === "BOOLEAN_COUNT") {
          const v = el.value.trim();
          if (v === "") continue;

          const deltaCount = Number(v);
          if (!deltaCount || Number.isNaN(deltaCount)) continue;

          const entryRef = doc(entriesRef);
          batch.set(entryRef, {
            trackId,
            type: "BOOLEAN",
            value: true,
            deltaCount,
            createdAt: serverTimestamp(),
            createdAtMs: Date.now(),
          });

          batch.set(
            dayRef,
            {
              tracks: {
                [trackId]: {
                  type: "BOOLEAN",
                  count: increment(deltaCount),
                  lastAt: serverTimestamp(),
                },
              },
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );

          writes++;
          continue;
        }
      }

      try {
        if (!writes) {
          status.textContent = "Nothing to save.";
          return;
        }
        await batch.commit();
        status.textContent = "Saved.";
        // Optional: clear only text inputs after save (keeps counters at 0)
        root.querySelectorAll('textarea[data-type="TEXT_APPEND"]').forEach((t) => (t.value = ""));
        root.querySelectorAll('input[data-type="NUMBER_REPLACE"]').forEach((i) => (i.value = ""));
        root.querySelectorAll('select[data-type="DROPDOWN_EVENT"]').forEach((s) => (s.value = ""));
        root.querySelectorAll('input[data-type="COUNTER_INCREMENT"]').forEach((i) => (i.value = "0"));
      } catch (e) {
        console.error("Save failed:", e);
        status.textContent = `Save failed: ${e?.message || String(e)}`;
      }
    });
  } catch (e) {
    console.error("TodayLog page load failed:", e);
    root.innerHTML = Shell({
      title: "Log",
      activeTab: "today",
      content: `
        <div class="center">
          <h2 style="margin:0 0 10px;">Couldn’t load Log</h2>
          <p class="muted" style="white-space:pre-wrap;">${esc(e?.message || String(e))}</p>
          <button class="btn" onclick="location.reload()">Reload</button>
        </div>
      `,
    });
  }
}
