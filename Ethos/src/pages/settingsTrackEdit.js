// src/pages/settingsTrackEdit.js

import { Shell } from "../components/shell.js";
import { navigate, getRoute } from "../router.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";

import {
  createTrack,
  updateTrack,
  deleteTrack,
  readAllTracks,
  computeNormalizedKey,
  upsertTrackTemplate,
} from "../lib/db.js";

import { SEED_TEMPLATES } from "../config/ethosConfig.js";

function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function uid6() {
  return Math.random().toString(36).slice(2, 8);
}

const TYPE_ORDER = ["", "COUNTER_INCREMENT", "BOOLEAN", "NUMBER_REPLACE", "TEXT_APPEND", "DROPDOWN_EVENT"];

const TYPE_LABELS = {
  COUNTER_INCREMENT: "Counter",
  BOOLEAN: "Checklist",
  NUMBER_REPLACE: "Metric",
  TEXT_APPEND: "Notes",
  DROPDOWN_EVENT: "Choice",
};

function baseDefaultsForType(type) {
  if (type === "COUNTER_INCREMENT") {
    return {
      unit: "ml",
      target: { mode: "value", value: 0 },
      config: { incrementStep: 250 },
    };
  }

  if (type === "BOOLEAN") {
    return {
      unit: "",
      target: null,
      config: { booleanMode: "done_only" },
    };
  }

  if (type === "NUMBER_REPLACE") {
    return {
      unit: "",
      target: null,
      config: { precision: 2 },
    };
  }

  if (type === "TEXT_APPEND") {
    return {
      unit: "",
      target: null,
      config: {},
    };
  }

  if (type === "DROPDOWN_EVENT") {
    return {
      unit: "",
      target: { mode: "count", value: 0 },
      config: { options: [{ id: uid6(), label: "" }] },
    };
  }

  return { unit: "", target: null, config: {} };
}

function coerceDraftToType(draft, nextType) {
  const keep = {
    name: draft.name ?? "",
    cadence: draft.cadence ?? "daily",
    type: nextType,
    isActive: draft.isActive ?? true,
    sortOrder: draft.sortOrder ?? Date.now(),
    isPrivate: !!draft.isPrivate,
    meta: draft.meta ?? {},
  };

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
      incrementStep: Number(draft.config?.incrementStep || 1),
    };
  }

  if (nextType === "BOOLEAN") {
    preserved.unit = "";
    preserved.target = null;
    preserved.config = {
      booleanMode: draft.config?.booleanMode || "done_only",
    };
  }

  if (nextType === "NUMBER_REPLACE") {
    preserved.unit = draft.unit || "";
    preserved.target = null;
    preserved.config = {
      precision: 2,
    };
  }

  if (nextType === "TEXT_APPEND") {
    preserved.unit = "";
    preserved.target = null;
    preserved.config = {};
  }

  if (nextType === "DROPDOWN_EVENT") {
    preserved.unit = "";
    preserved.target = {
      mode: "count",
      value: Number(draft.target?.value || 0),
    };
    preserved.config = {
      options: Array.isArray(draft.config?.options) ? draft.config.options : defaults.config.options,
    };
  }

  return {
    ...keep,
    unit: preserved.unit ?? defaults.unit,
    target: preserved.target ?? defaults.target,
    config: preserved.config ?? defaults.config,
  };
}

function renderTypeFields(draft) {
  const t = draft.type;

  if (!t) return `<div class="muted" style="margin-top:8px;">Select a type to configure it.</div>`;

  if (t === "COUNTER_INCREMENT") {
    return `
      <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
        <label class="field" style="min-width:200px;">
          <div class="label">Unit</div>
          <input class="input" id="unit" value="${esc(draft.unit || "")}" placeholder="ml / reps / steps..." />
        </label>

        <label class="field" style="min-width:200px;">
          <div class="label">Target</div>
          <input class="input" id="targetValue" type="number" value="${Number(draft.target?.value || 0)}" />
        </label>

        <label class="field" style="min-width:200px;">
          <div class="label">Increment step</div>
          <input class="input" id="incrementStep" type="number" value="${Number(draft.config?.incrementStep || 1)}" />
        </label>
      </div>
    `;
  }

  if (t === "BOOLEAN") {
    return `<div class="muted" style="margin-top:10px;">Checklist track (done / not done). No extra settings.</div>`;
  }

  if (t === "NUMBER_REPLACE") {
    return `
      <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
        <label class="field" style="min-width:200px;">
          <div class="label">Unit</div>
          <input class="input" id="unit" value="${esc(draft.unit || "")}" placeholder="kg / bpm..." />
        </label>
        <div class="muted" style="margin-top:8px;">Precision is fixed internally.</div>
      </div>
    `;
  }

  if (t === "TEXT_APPEND") {
    return `<div class="muted" style="margin-top:10px;">Notes track (append-only). No extra settings.</div>`;
  }

  if (t === "DROPDOWN_EVENT") {
    const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];
    return `
      <div style="margin-top:10px;">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div class="label">Options</div>
          <button class="btn" id="addOpt" type="button">Add</button>
        </div>
        <div style="margin-top:8px;display:flex;flex-direction:column;gap:8px;">
          ${opts
            .map(
              (o, i) => `
              <div class="row" style="gap:8px;align-items:center;">
                <input class="input" data-opt="${i}" value="${esc(o.label || "")}" placeholder="Option label" />
                <button class="btn" data-up="${i}" type="button">↑</button>
                <button class="btn" data-down="${i}" type="button">↓</button>
                <button class="btn danger" data-del="${i}" type="button">×</button>
              </div>
            `
            )
            .join("")}
        </div>
        <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
          <label class="field" style="min-width:200px;">
            <div class="label">Target count</div>
            <input class="input" id="targetCount" type="number" value="${Number(draft.target?.value || 0)}" />
          </label>
        </div>
      </div>
    `;
  }

  return "";
}

function renderPage({ mode, draft, publishAsTemplate }) {
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

          <div id="typeFields">${renderTypeFields(draft)}</div>

          <!-- Publish toggle at END -->
          <div class="field" style="margin-top:12px;">
            <div class="row" style="justify-content:space-between;align-items:center;gap:10px;">
              <div>
                <div class="mini muted">Publish as template</div>
                <div class="muted" style="font-size:12px;margin-top:2px;">
                  Makes this available as a starting template for others.
                </div>
              </div>
              <button class="switch ${publishAsTemplate ? "on" : ""}" id="publishSwitch" type="button"></button>
            </div>
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
    patch.config = { precision: 2 };
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
  const seedId = query.get("seedId");
  const templateId = query.get("templateId");

  if (mode === "edit" && !trackId) {
    navigate("#/settings/tracks");
    return;
  }

  root.innerHTML = Shell({
    title: "Track",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  let template = null;

  // Seed template: local config only
  if (!trackId && seedId) {
    const seed = (SEED_TEMPLATES || []).find((t) => t.id === seedId);
    if (seed) {
      template = {
        id: seed.id,
        name: seed.name,
        cadence: seed.track?.cadence || "daily",
        type: seed.track?.type || "",
        unit: seed.track?.unit || "",
        target: seed.track?.target ?? null,
        config: seed.track?.config ?? {},
        category: seed.category ?? null,
      };
    }
  }

  // DB template: Firestore read (guarded)
  if (!trackId && !template && templateId) {
    try {
      const tSnap = await getDoc(doc(db, "trackTemplates", templateId));
      if (tSnap.exists()) template = { id: tSnap.id, ...tSnap.data() };
    } catch (e) {
      console.warn("Template read failed:", e?.message || e);
      template = null;
    }
  }

  let existing = null;

  if (mode === "edit") {
    const ref = doc(db, "users", user.uid, "tracks", trackId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      alert("Track not found.");
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
          meta: existing.meta ?? {},
        },
        existing.type || ""
      )
    : template
    ? coerceDraftToType(
        {
          name: template.name || "",
          cadence: template.cadence || "daily",
          type: template.type || "",
          unit: template.unit,
          target: template.target ?? null,
          config: template.config ?? {},
          isActive: true,
          sortOrder: Date.now(),
          isPrivate: false,
          meta: {
            templateId: template.id,
            category: template.category ?? undefined,
          },
        },
        template.type || ""
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
        meta: {},
      };

  let publishAsTemplate = false;

  function render() {
    root.innerHTML = renderPage({ mode, draft, publishAsTemplate });

    root.querySelector("#back").addEventListener("click", () => navigate("#/settings/tracks"));

    root.querySelector("#name").addEventListener("input", (e) => (draft.name = e.target.value));
    root.querySelector("#cadence").addEventListener("change", (e) => (draft.cadence = e.target.value));

    root.querySelector("#privacySwitch").addEventListener("click", () => {
      draft.isPrivate = !draft.isPrivate;
      render();
    });

    root.querySelector("#publishSwitch").addEventListener("click", () => {
      publishAsTemplate = !publishAsTemplate;
      render();
    });

    root.querySelector("#type").addEventListener("change", (e) => {
      draft = coerceDraftToType(draft, e.target.value);
      render();
    });

    const t = draft.type;

    if (t === "COUNTER_INCREMENT") {
      root.querySelector("#unit").addEventListener("input", (e) => (draft.unit = e.target.value));
      root.querySelector("#targetValue").addEventListener(
        "input",
        (e) => (draft.target = { mode: "value", value: Number(e.target.value || 0) })
      );
      root.querySelector("#incrementStep").addEventListener(
        "input",
        (e) => (draft.config = { ...(draft.config ?? {}), incrementStep: Number(e.target.value || 1) })
      );
    }

    if (t === "NUMBER_REPLACE") {
      root.querySelector("#unit").addEventListener("input", (e) => (draft.unit = e.target.value));
    }

    if (t === "DROPDOWN_EVENT") {
      root.querySelector("#addOpt")?.addEventListener("click", () => {
        const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];
        opts.push({ id: uid6(), label: "" });
        draft.config = { ...(draft.config ?? {}), options: opts };
        render();
      });

      const opts = Array.isArray(draft.config?.options) ? draft.config.options : [];

      root.querySelectorAll("[data-opt]").forEach((el) => {
        el.addEventListener("input", (e) => {
          const i = Number(el.getAttribute("data-opt"));
          opts[i] = { ...opts[i], label: e.target.value };
          draft.config = { ...(draft.config ?? {}), options: opts };
        });
      });

      root.querySelectorAll("[data-up]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-up"));
          if (i <= 0) return;
          [opts[i - 1], opts[i]] = [opts[i], opts[i - 1]];
          draft.config = { ...(draft.config ?? {}), options: opts };
          render();
        });
      });

      root.querySelectorAll("[data-down]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-down"));
          if (i >= opts.length - 1) return;
          [opts[i + 1], opts[i]] = [opts[i], opts[i + 1]];
          draft.config = { ...(draft.config ?? {}), options: opts };
          render();
        });
      });

      root.querySelectorAll("[data-del]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const i = Number(btn.getAttribute("data-del"));
          opts.splice(i, 1);
          draft.config = { ...(draft.config ?? {}), options: opts };
          render();
        });
      });

      root.querySelector("#targetCount")?.addEventListener(
        "input",
        (e) => (draft.target = { mode: "count", value: Number(e.target.value || 0) })
      );
    }

    root.querySelector("#save").addEventListener("click", async () => {
      try {
        const patch = buildPatch(draft);

        const normalizedKey = computeNormalizedKey(patch);

        // Always stamp meta
        const meta = {
          ...(draft.meta ?? {}),
          createdBy: user.uid,
          normalizedKey,
        };

        // --- DUPLICATE PREVENTION (only for NEW)
        if (mode !== "edit") {
          const existingTracks = await readAllTracks(user.uid);

          const match = existingTracks.find((tr) => {
            const trPatch = {
              name: tr.name,
              type: tr.type,
              cadence: tr.cadence,
              unit: tr.unit,
              target: tr.target ?? null,
              config: tr.config ?? {},
            };
            return computeNormalizedKey(trPatch) === normalizedKey;
          });

          if (match) {
            // Activate if needed
            if (match.isActive === false) {
              await updateTrack(user.uid, match.id, { isActive: true });
            }
            // Go to edit that existing track (no duplicates created)
            navigate(`#/settings/tracks/edit?trackId=${match.id}`);
            return;
          }
        }

        // --- Publish as template if requested
        if (publishAsTemplate) {
          const tid = await upsertTrackTemplate({
            track: { ...patch, meta },
            createdBy: user.uid,
            createdByName: user.displayName ?? null,
            category: meta.category ?? null,
          });
          meta.templateId = tid;
        }

        // Save
        if (mode === "edit") {
          await updateTrack(user.uid, trackId, { ...patch, meta });
        } else {
          await createTrack(user.uid, {
            ...patch,
            meta,
            isActive: true,
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
