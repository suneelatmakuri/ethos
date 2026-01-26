// src/pages/settingsTrackEdit.js
import { Shell } from "../components/shell.js";
import { navigate, getRoute } from "../router.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { createTrack, updateTrack, deleteTrack } from "../lib/db.js";

function getQueryParam(name) {
  const { path } = getRoute();
  const idx = path.indexOf("?");
  if (idx === -1) return null;
  const qs = new URLSearchParams(path.slice(idx + 1));
  return qs.get(name);
}

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function uid6() {
  return Math.random().toString(36).slice(2, 8);
}

const TYPE_LABELS = {
  COUNTER_INCREMENT: "Counter",
  BOOLEAN: "Checklist",
  NUMBER_REPLACE: "Metric",
  TEXT_APPEND: "Notes",
  DROPDOWN_EVENT: "Choice",
};

const TYPE_ORDER = [
  "", // placeholder
  "COUNTER_INCREMENT",
  "BOOLEAN",
  "NUMBER_REPLACE",
  "TEXT_APPEND",
  "DROPDOWN_EVENT",
];

function baseDefaultsForType(type) {
  // Note: cadence is global now and always present on track.
  const common = { unit: "", target: null, config: {} };

  if (type === "COUNTER_INCREMENT") {
    return {
      ...common,
      target: { mode: "value", value: 0 }, // 0 => no target
      config: { incrementStep: 1 },
    };
  }

  if (type === "BOOLEAN") {
    return { ...common, target: null, config: { booleanMode: "done_only" } };
  }

  if (type === "NUMBER_REPLACE") {
    return { ...common, target: null, config: { precision: 2 } }; // fixed
  }

  if (type === "TEXT_APPEND") {
    return { ...common, target: null, config: {} };
  }

  if (type === "DROPDOWN_EVENT") {
    return {
      ...common,
      target: { mode: "count", value: 0 }, // 0 => no target
      config: { options: [] },
    };
  }

  return common;
}

function coerceDraftToType(draft, nextType) {
  // Preserve global fields: name, cadence, privacy, etc.
  const keep = {
    name: draft.name ?? "",
    cadence: draft.cadence ?? "daily",
    type: nextType,
    isActive: draft.isActive ?? true,
    sortOrder: draft.sortOrder ?? Date.now(),
    isPrivate: !!draft.isPrivate,
  };

  // If type is blank, just clear type-specific fields.
  if (!nextType) {
    return {
      ...keep,
      unit: "",
      target: null,
      config: {},
    };
  }

  const defaults = baseDefaultsForType(nextType);

  const preserved = {};

  if (nextType === "COUNTER_INCREMENT") {
    preserved.unit = draft.unit || "";
    preserved.target = {
      mode: draft.target?.mode || "value",
      value: Number(draft.target?.value || 0),
    };
    preserved.config = {
      incrementStep: Number(draft.config?.incrementStep || defaults.config.incrementStep || 1),
    };
  }

  if (nextType === "BOOLEAN") {
    preserved.unit = "";
    preserved.target = null;
    preserved.config = { booleanMode: "done_only" };
  }

  if (nextType === "NUMBER_REPLACE") {
    preserved.unit = draft.unit || "";
    preserved.target = null;
    preserved.config = { precision: 2 }; // fixed default
  }

  if (nextType === "TEXT_APPEND") {
    preserved.unit = "";
    preserved.target = null;
    preserved.config = {};
  }

  if (nextType === "DROPDOWN_EVENT") {
    preserved.unit = "";
    preserved.target = { mode: "count", value: Number(draft.target?.value || 0) };
    const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];
    preserved.config = { options: opts.map((o) => ({ id: o.id || uid6(), label: o.label || "" })) };
  }

  return { ...keep, ...defaults, ...preserved };
}

function renderTypeFields(draft) {
  const t = draft.type;

  // Blank type => blank settings block
  if (!t) return "";

  // Checklist & Notes => no settings block
  if (t === "BOOLEAN") return "";
  if (t === "TEXT_APPEND") return "";

  if (t === "COUNTER_INCREMENT") {
    return `
      <div class="card" style="margin-top:12px;">
        <div class="card-title">Counter settings</div>

        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="min-width:220px;">
            <div class="label">Unit</div>
            <input class="input" id="unit" value="${esc(draft.unit || "")}" placeholder="ml / steps / times" />
          </label>

          <label class="field" style="min-width:220px;">
            <div class="label">Increment step</div>
            <input class="input" id="incrementStep" type="number" min="0" step="1"
              value="${Number(draft.config?.incrementStep || 1)}" placeholder="1" />
            <div class="mini muted">Example: 250 for water in ml, or 1 for “times”.</div>
          </label>
        </div>

        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="min-width:220px;">
            <div class="label">Target mode</div>
            <select class="select" id="targetMode">
              <option value="value" ${draft.target?.mode === "value" ? "selected" : ""}>value</option>
              <option value="count" ${draft.target?.mode === "count" ? "selected" : ""}>count</option>
            </select>
            <div class="mini muted">Use count for “times”, value for “amount”.</div>
          </label>

          <label class="field" style="min-width:220px;">
            <div class="label">Target value (optional)</div>
            <input class="input" id="targetValue" type="number" min="0" step="1"
              value="${Number(draft.target?.value || 0)}" />
            <div class="mini muted">0 means “no target”.</div>
          </label>
        </div>
      </div>
    `;
  }

  if (t === "NUMBER_REPLACE") {
    return `
      <div class="card" style="margin-top:12px;">
        <div class="card-title">Metric settings</div>
        <div class="mini muted">Latest value persists until changed.</div>

        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="min-width:220px;">
            <div class="label">Unit (optional)</div>
            <input class="input" id="unit" value="${esc(draft.unit || "")}" placeholder="kg / cm / bpm" />
          </label>
        </div>

        <div class="mini muted" style="margin-top:8px;">Precision is fixed to 2 decimals for now.</div>
      </div>
    `;
  }

  if (t === "DROPDOWN_EVENT") {
    const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];
    const list = opts.length
      ? opts
          .map(
            (o, idx) => `
          <div class="row" style="justify-content:space-between;align-items:center;gap:10px;padding:10px;border:1px solid var(--border);border-radius:12px;">
            <div style="flex:1;min-width:0;">
              <div style="font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(o.label || "—")}</div>
              <div class="mini muted">Option ${idx + 1}</div>
            </div>
            <div class="row" style="gap:6px;">
              <button class="btn" type="button" data-opt-up="${o.id}" ${idx === 0 ? "disabled" : ""}>↑</button>
              <button class="btn" type="button" data-opt-down="${o.id}" ${idx === opts.length - 1 ? "disabled" : ""}>↓</button>
              <button class="btn danger" type="button" data-opt-del="${o.id}">Remove</button>
            </div>
          </div>
        `
          )
          .join("")
      : `<div class="mini muted" style="margin-top:8px;">No options yet.</div>`;

    return `
      <div class="card" style="margin-top:12px;">
        <div class="card-title">Choice settings</div>
        <div class="mini muted">Pick one option (e.g., workout type).</div>

        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="min-width:220px;">
            <div class="label">Target count (optional)</div>
            <input class="input" id="targetValue" type="number" min="0" step="1"
              value="${Number(draft.target?.value || 0)}" />
            <div class="mini muted">0 means “no target”.</div>
          </label>
        </div>

        <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="flex:1;min-width:220px;">
            <div class="label">Add option</div>
            <input class="input" id="optLabel" placeholder="e.g., Chest / Legs / Full body" />
          </label>
          <button class="btn primary" id="optAdd" type="button" style="align-self:flex-end;height:44px;">Add</button>
        </div>

        <div class="stack" style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">
          ${list}
        </div>
      </div>
    `;
  }

  return "";
}

function renderPage({ mode, draft }) {
  return Shell({
    title: mode === "edit" ? "Edit Track" : "New Track",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">${mode === "edit" ? "Edit track" : "Create a track"}</div>
            <div class="muted">Keep it simple. You can refine later.</div>
          </div>
          <button class="btn" id="back" type="button">Back</button>
        </div>

        <div class="form" style="margin-top:12px;">
          <label class="field">
            <div class="label">Name</div>
            <input class="input" id="name" value="${esc(draft.name || "")}" placeholder="Water / Steps / Journal…" />
          </label>

          <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-end;margin-top:10px;">
            <label class="field" style="min-width:220px;">
              <div class="label">Cadence</div>
              <select class="select" id="cadence">
                ${[
                  { v: "daily", l: "Daily" },
                  { v: "weekly", l: "Weekly" },
                  { v: "monthly", l: "Monthly" },
                  { v: "yearly", l: "Yearly" },
                ]
                  .map(
                    ({ v, l }) =>
                      `<option value="${v}" ${draft.cadence === v ? "selected" : ""}>${l}</option>`
                  )
                  .join("")}
              </select>
            </label>

            <div class="field" style="flex:1;min-width:260px;">
              <div class="row" style="justify-content:space-between;align-items:center;gap:10px;">
                <div class="mini muted">Private (won’t appear on leaderboard)</div>
                <button class="switch ${draft.isPrivate ? "on" : ""}" id="privacySwitch" type="button"></button>
              </div>
            </div>

            <label class="field" style="min-width:220px;">
              <div class="label">Type</div>
              <select class="select" id="type">
                ${TYPE_ORDER.map((t) => {
                  if (!t) return `<option value="" ${!draft.type ? "selected" : ""}>Select</option>`;
                  return `<option value="${t}" ${draft.type === t ? "selected" : ""}>${esc(
                    TYPE_LABELS[t] || t
                  )}</option>`;
                }).join("")}
              </select>
            </label>
          </div>

          <div id="typeFields">
            ${renderTypeFields(draft)}
          </div>

          <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px;">
            ${mode === "edit" ? `<button class="btn danger" id="del" type="button">Delete</button>` : ""}
            <button class="btn primary" id="save" type="button">Save</button>
          </div>
        </div>
      </section>
    `,
  });
}

function buildPatch(draft) {
  const name = (draft.name || "").trim();
  if (!name) throw new Error("Name is required.");

  const cadence = draft.cadence || "daily";

  const type = draft.type;
  if (!type) throw new Error("Select a type.");

  const base = coerceDraftToType(draft, type);

  const patch = {
    name,
    cadence,
    type,
    isPrivate: !!base.isPrivate,
  };

  if (type === "COUNTER_INCREMENT") {
    const unit = (base.unit || "").trim();
    if (!unit) throw new Error("Unit is required for Counter.");
    patch.unit = unit;
    patch.target = { mode: base.target?.mode || "value", value: Number(base.target?.value || 0) };
    patch.config = { incrementStep: Math.max(0, Number(base.config?.incrementStep || 1)) };
  }

  if (type === "BOOLEAN") {
    patch.unit = "";
    patch.target = null;
    patch.config = { booleanMode: "done_only" };
  }

  if (type === "NUMBER_REPLACE") {
    patch.unit = (base.unit || "").trim();
    patch.target = null;
    patch.config = { precision: 2 }; // fixed
  }

  if (type === "TEXT_APPEND") {
    patch.unit = "";
    patch.target = null;
    patch.config = {};
  }

  if (type === "DROPDOWN_EVENT") {
    patch.unit = "";
    patch.target = { mode: "count", value: Number(base.target?.value || 0) };

    const opts = Array.isArray(base.config?.options) ? base.config.options : [];
    const cleaned = opts
      .map((o) => ({ id: o.id || uid6(), label: (o.label || "").trim() }))
      .filter((o) => o.label.length);

    if (!cleaned.length) throw new Error("Add at least one option.");
    patch.config = { options: cleaned };
  }

  return patch;
}

export async function settingsTrackEditPage({ user, mode }) {
  const root = document.getElementById("app");
  const { query } = getRoute();
  const trackId = query.get("trackId");


  if (mode === "edit" && !trackId) {
    navigate("#/settings/tracks");
    return;
  }

  root.innerHTML = Shell({
    title: "Track",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  let existing = null;

  if (mode === "edit") {
    const ref = doc(db, "users", user.uid, "tracks", trackId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      navigate("#/settings/tracks");
      return;
    }
    existing = { id: snap.id, ...snap.data() };
  }

  let draft = existing
    ? coerceDraftToType(
        {
          name: existing.name || "",
          cadence: existing.cadence || "daily",
          type: existing.type || "",
          unit: existing.unit,
          target: existing.target ?? null,
          config: existing.config ?? {},
          isActive: existing.isActive ?? true,
          sortOrder: existing.sortOrder ?? Date.now(),
          isPrivate: !!existing.isPrivate,
        },
        existing.type || ""
      )
    : {
        name: "",
        cadence: "daily",
        type: "",
        isPrivate: false,
        isActive: true,
        sortOrder: Date.now(),
        unit: "",
        target: null,
        config: {},
      };

  function render() {
    root.innerHTML = renderPage({ mode, draft });

    root.querySelector("#back").addEventListener("click", () => navigate("#/settings/tracks"));

    root.querySelector("#name").addEventListener("input", (e) => {
      draft.name = e.target.value;
    });

    root.querySelector("#cadence").addEventListener("change", (e) => {
      draft.cadence = e.target.value;
    });

    root.querySelector("#privacySwitch").addEventListener("click", () => {
      draft.isPrivate = !draft.isPrivate;
      render();
    });

    root.querySelector("#type").addEventListener("change", (e) => {
      draft = coerceDraftToType(draft, e.target.value);
      render();
    });

    const t = draft.type;

    if (t === "COUNTER_INCREMENT") {
      root.querySelector("#unit").addEventListener("input", (e) => (draft.unit = e.target.value));

      root.querySelector("#incrementStep").addEventListener("input", (e) => {
        draft.config = { ...(draft.config || {}), incrementStep: Number(e.target.value || 1) };
      });

      root.querySelector("#targetMode").addEventListener("change", (e) => {
        draft.target = { ...(draft.target || {}), mode: e.target.value };
      });

      root.querySelector("#targetValue").addEventListener("input", (e) => {
        draft.target = { ...(draft.target || {}), value: Number(e.target.value || 0) };
      });
    }

    if (t === "NUMBER_REPLACE") {
      root.querySelector("#unit").addEventListener("input", (e) => (draft.unit = e.target.value));
    }

    if (t === "DROPDOWN_EVENT") {
      root.querySelector("#targetValue").addEventListener("input", (e) => {
        draft.target = { ...(draft.target || {}), mode: "count", value: Number(e.target.value || 0) };
      });

      root.querySelector("#optAdd").addEventListener("click", () => {
        const input = root.querySelector("#optLabel");
        const label = (input.value || "").trim();
        if (!label) return;

        const options = Array.isArray(draft.config?.options) ? draft.config.options : [];
        draft.config = { ...(draft.config || {}), options: [...options, { id: uid6(), label }] };
        input.value = "";
        render();
      });

      root.querySelector("#optLabel").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          root.querySelector("#optAdd").click();
        }
      });

      root.querySelectorAll("[data-opt-up]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.optUp;
          const opts = Array.isArray(draft.config?.options) ? [...draft.config.options] : [];
          const idx = opts.findIndex((o) => o.id === id);
          if (idx <= 0) return;
          [opts[idx - 1], opts[idx]] = [opts[idx], opts[idx - 1]];
          draft.config = { ...(draft.config || {}), options: opts };
          render();
        });
      });

      root.querySelectorAll("[data-opt-down]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.optDown;
          const opts = Array.isArray(draft.config?.options) ? [...draft.config.options] : [];
          const idx = opts.findIndex((o) => o.id === id);
          if (idx === -1 || idx >= opts.length - 1) return;
          [opts[idx + 1], opts[idx]] = [opts[idx], opts[idx + 1]];
          draft.config = { ...(draft.config || {}), options: opts };
          render();
        });
      });

      root.querySelectorAll("[data-opt-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.optDel;
          const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];
          draft.config = { ...(draft.config || {}), options: opts.filter((o) => o.id !== id) };
          render();
        });
      });
    }

    root.querySelector("#save").addEventListener("click", async () => {
      try {
        const patch = buildPatch(draft);

        if (mode === "edit") {
          await updateTrack(user.uid, trackId, patch);
        } else {
          await createTrack(user.uid, {
            ...patch,
            isActive: true, // activation handled in Settings → Tracks
            sortOrder: Date.now(),
          });
        }

        navigate("#/settings/tracks");
      } catch (e) {
        alert(e?.message || String(e));
      }
    });

    root.querySelector("#del")?.addEventListener("click", async () => {
      if (!confirm("Delete this track? This won’t delete past entries.")) return;
      await deleteTrack(user.uid, trackId);
      navigate("#/settings/tracks");
    });
  }

  render();
}
