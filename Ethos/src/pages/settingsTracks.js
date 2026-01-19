// src/pages/settingsTracks.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";

import {
  readAllTracks,
  seedDefaultTracksIfEmpty,
  updateTrack,
} from "../lib/ethosDb.js";

export async function settingsTracksPage({ user }) {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Tracks",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  // Load ALL tracks so we can show Active + Inactive
  const all = await readAllTracks(user.uid);

  // split
  const active = all.filter((t) => t.isActive !== false);
  const inactive = all.filter((t) => t.isActive === false);

  root.innerHTML = Shell({
    title: "Manage Tracks",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">Tracks</div>
            <div class="muted">What you want to notice, repeat, or reflect on.</div>
          </div>
          <button class="btn" id="back">Back</button>
        </div>

        <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px;">
          <button class="btn primary" id="newTrack">Add new track</button>
          <button class="btn" id="seed">Add defaults (if empty)</button>
        </div>
      </section>

      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">Active tracks</div>
            <div class="muted">Reorder what shows on Today.</div>
          </div>
        </div>

        ${active.length ? `<div class="list">${active.map((t, idx) => renderTrackRow(t, idx, active.length, true)).join("")}</div>` : `
          <div class="muted">No active tracks yet.</div>
        `}
      </section>

      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">Inactive tracks</div>
            <div class="muted">Hidden from Today. You can re-activate anytime.</div>
          </div>
        </div>

        ${inactive.length ? `<div class="list">${inactive.map((t) => renderTrackRow(t, -1, -1, false)).join("")}</div>` : `
          <div class="muted">No inactive tracks.</div>
        `}
      </section>
    `,
  });

  // nav
  root.querySelector("#back").addEventListener("click", () => navigate("#/settings"));
  root.querySelector("#newTrack").addEventListener("click", () => navigate("#/settings/tracks/new"));

  root.querySelector("#seed").addEventListener("click", async () => {
    const res = await seedDefaultTracksIfEmpty(user.uid);
    alert(res.didSeed ? "Defaults added." : "You already have tracks.");
    // immediate refresh
    settingsTracksPage({ user });
  });

  // Toggle activate/deactivate with immediate UI update
  root.querySelectorAll("[data-toggle]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const trackId = btn.getAttribute("data-toggle");
      const next = btn.getAttribute("data-next") === "true";

      // Optimistic UI: disable button immediately
      btn.disabled = true;
      btn.textContent = "Saving…";

      try {
        await updateTrack(user.uid, trackId, { isActive: next });
        // Re-render page without full refresh
        await settingsTracksPage({ user });
      } catch (e) {
        console.error("Toggle failed:", e);
        alert(e?.message || "Could not update track.");
        // restore
        btn.disabled = false;
        btn.textContent = next ? "Activate" : "Deactivate";
      }
    });
  });

  // Edit
  root.querySelectorAll("[data-edit]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const trackId = btn.getAttribute("data-edit");
      navigate(`#/settings/tracks/edit?trackId=${encodeURIComponent(trackId)}`);
    });
  });

  // Reorder: Up/Down buttons (MVP, reliable)
  root.querySelectorAll("[data-move]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const trackId = btn.getAttribute("data-move");
      const dir = btn.getAttribute("data-dir"); // "up" | "down"

      const idx = active.findIndex((t) => t.id === trackId);
      if (idx < 0) return;

      const otherIdx = dir === "up" ? idx - 1 : idx + 1;
      if (otherIdx < 0 || otherIdx >= active.length) return;

      const a = active[idx];
      const b = active[otherIdx];

      // swap sortOrder values
      // If missing, fallback to timestamp-ish numbers
      const aOrder = Number(a.sortOrder || 0);
      const bOrder = Number(b.sortOrder || 0);

      btn.disabled = true;

      try {
        await Promise.all([
          updateTrack(user.uid, a.id, { sortOrder: bOrder || Date.now() }),
          updateTrack(user.uid, b.id, { sortOrder: aOrder || Date.now() + 1 }),
        ]);

        await settingsTracksPage({ user });
      } catch (e) {
        console.error("Reorder failed:", e);
        alert(e?.message || "Could not reorder.");
        btn.disabled = false;
      }
    });
  });

  function renderTrackRow(t, idx, total, isActiveList) {
    const canMoveUp = isActiveList && idx > 0;
    const canMoveDown = isActiveList && idx >= 0 && idx < total - 1;

    return `
      <div class="list-item" style="cursor:default;">
        <div style="min-width:0;">
          <div class="li-title">${t.name}</div>
          <div class="muted">${t.type} · ${t.cadence}${t.unit ? ` · ${t.unit}` : ""}</div>
        </div>

        <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:flex-end;">
          ${isActiveList ? `
            <button class="btn" data-move="${t.id}" data-dir="up" ${canMoveUp ? "" : "disabled"} title="Move up">↑</button>
            <button class="btn" data-move="${t.id}" data-dir="down" ${canMoveDown ? "" : "disabled"} title="Move down">↓</button>
          ` : ""}

          <button class="btn" data-edit="${t.id}">Edit</button>

          ${
            (t.isActive !== false)
              ? `<button class="btn" data-toggle="${t.id}" data-next="false">Deactivate</button>`
              : `<button class="btn primary" data-toggle="${t.id}" data-next="true">Activate</button>`
          }
        </div>
      </div>
    `;
  }
}
