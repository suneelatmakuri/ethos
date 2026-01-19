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
  return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

export async function todayLogPage({ user, profile }) {
  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Log",
    activeTab: "today",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  const timeZone = profile?.timeZone || profile?.preferences?.timeZone || "Asia/Kolkata";
  const dayKey = getDayKeyNow(timeZone);
  const { weekKey, monthKey } = getPeriodKeysForDayKey(dayKey);

  try {
    const tracks = await readActiveTracks(user.uid);
    const dayDoc = await getDayDoc(user.uid, dayKey);

    const form = tracks.map((t) => {
      const agg = dayDoc?.tracks?.[t.id] || null;

      if (t.type === "NUMBER_REPLACE") {
        const current = (agg?.value === 0 || agg?.value) ? agg.value : "";
        return `
          <div class="card">
            <div class="card-title">${esc(t.name)}</div>
            <div class="mini muted">Current: ${current === "" ? "—" : esc(current)} ${esc(t.unit || "")}</div>
            <input class="input" type="number" step="${t.config?.precision ? (1 / Math.pow(10, t.config.precision)) : "any"}"
              data-track="${t.id}" data-type="NUMBER_REPLACE" placeholder="Enter value" />
          </div>
        `;
      }

      if (t.type === "TEXT_APPEND") {
        return `
          <div class="card">
            <div class="card-title">${esc(t.name)}</div>
            <div class="mini muted">${agg?.count ? `Entries today: ${agg.count}` : "No entries yet"}</div>
            <textarea class="textarea" data-track="${t.id}" data-type="TEXT_APPEND" placeholder="Write a quick note..."></textarea>
          </div>
        `;
      }

      if (t.type === "DROPDOWN_EVENT") {
        const opts = (t.config?.options || []).map(o =>
          `<option value="${esc(o.id)}">${esc(o.label)}</option>`
        ).join("");
        return `
          <div class="card">
            <div class="card-title">${esc(t.name)}</div>
            <div class="mini muted">${agg?.count ? `Count today: ${agg.count}` : "No events yet"}</div>
            <select class="select" data-track="${t.id}" data-type="DROPDOWN_EVENT">
              <option value="">Select…</option>
              ${opts}
            </select>
          </div>
        `;
      }

      if (t.type === "COUNTER_INCREMENT") {
        const step = t.config?.incrementStep || 1;
        const currentSum = agg?.sum || 0;
        return `
          <div class="card">
            <div class="card-title">${esc(t.name)}</div>
            <div class="mini muted">Today: ${esc(currentSum)} ${esc(t.unit || "")}</div>
            <input class="input" type="number" min="0" step="${step}"
              data-track="${t.id}" data-type="COUNTER_INCREMENT"
              placeholder="Add amount (e.g. ${step})" />
          </div>
        `;
      }

      if (t.type === "BOOLEAN") {
        const mode = t.config?.booleanMode || "done_only";
        if (mode === "done_only") {
          const checked = agg?.done ? "checked" : "";
          return `
            <div class="card">
              <div class="card-title">${esc(t.name)}</div>
              <label class="toggle">
                <input type="checkbox" data-track="${t.id}" data-type="BOOLEAN_DONE" ${checked}/>
                Done today
              </label>
            </div>
          `;
        }
        // count mode
        return `
          <div class="card">
            <div class="card-title">${esc(t.name)}</div>
            <div class="mini muted">Today count: ${agg?.count || 0}</div>
            <input class="input" type="number" min="0" step="1"
              data-track="${t.id}" data-type="BOOLEAN_COUNT"
              placeholder="Add count (e.g. 1)" />
          </div>
        `;
      }

      return "";
    }).join("");

    root.innerHTML = Shell({
      title: "Log",
      activeTab: "today",
      content: `
        <div class="content">
          <div class="row" style="justify-content:space-between;align-items:center;margin-bottom:12px;">
            <div>
              <div class="mini muted">${dayKey} • ${timeZone}</div>
              <div style="font-weight:700;font-size:18px;">Log entries</div>
            </div>
            <button class="btn" id="back" type="button">Back</button>
          </div>

          ${form}

          <div class="row" style="justify-content:flex-end;gap:10px;margin-top:10px;">
            <button class="btn primary" id="submit" type="button">Submit</button>
          </div>

          <div class="mini muted" id="status" style="min-height:18px;margin-top:8px;"></div>
        </div>
      `,
    });

    root.querySelector("#back").addEventListener("click", () => navigate("#/today"));

    root.querySelector("#submit").addEventListener("click", async () => {
      const status = root.querySelector("#status");
      status.textContent = "Saving…";

      const batch = writeBatch(db);

      const dayRef = doc(db, "users", user.uid, "days", dayKey);
      // ensure day doc exists / has period keys
      batch.set(dayRef, {
        dayKey,
        timeZone,
        period: { weekKey, monthKey },
        updatedAt: serverTimestamp(),
      }, { merge: true });

      const entriesRef = collection(db, "users", user.uid, "days", dayKey, "entries");

      // Gather inputs
      const inputs = Array.from(root.querySelectorAll("[data-track][data-type]"));

      let writes = 0;

      for (const el of inputs) {
        const trackId = el.dataset.track;
        const type = el.dataset.type;

        // skip empty fields
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
          

        if (type === "NUMBER_REPLACE") {
            const v = el.value.trim();
            if (v === "") continue;
          
            const value = Number(v);
            if (Number.isNaN(value)) continue;
          
            const entryRef = doc(entriesRef);
          
            // 1) Entry doc
            batch.set(entryRef, {
              trackId,
              type: "NUMBER_REPLACE",
              value,
              createdAt: serverTimestamp(),
              createdAtMs: Date.now(),
            });
          
            // 2) Day aggregates (nested map)
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
          

        if (type === "COUNTER_INCREMENT") {
            const v = el.value.trim();
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
          

        if (type === "BOOLEAN_COUNT") {
            const v = el.value.trim();
            if (v === "") continue;
          
            const deltaCount = Number(v);
            if (!deltaCount || Number.isNaN(deltaCount)) continue;
          
            const entryRef = doc(entriesRef);
          
            batch.set(entryRef, {
              trackId,
              type: "BOOLEAN",
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
                    done: true,
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

      if (!writes) {
        status.textContent = "Nothing to save.";
        setTimeout(() => (status.textContent = ""), 1200);
        return;
      }

      try {
        await batch.commit();
        status.textContent = "Saved.";
        // go back to Today summary (it will fetch fresh)
        navigate("#/today");
      } catch (e) {
        console.error("Log submit failed:", e);
        status.textContent = `Save failed: ${e?.message || e}`;
        alert(`Save failed:\n${e?.message || e}`);
      }
    });
  } catch (e) {
    console.error("Today log page load failed:", e);
    root.innerHTML = Shell({
      title: "Log",
      activeTab: "today",
      content: `
        <div class="center">
          <h2 style="margin:0 0 10px;">Couldn’t load Log</h2>
          <p class="muted" style="white-space:pre-wrap;">${e?.message || String(e)}</p>
          <button class="btn" onclick="location.reload()">Reload</button>
        </div>
      `,
    });
  }
}
