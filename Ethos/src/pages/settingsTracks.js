// src/pages/settingsTracks.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import { readAllTracks, updateTrack, deleteTrack } from "../lib/ethosDb.js";

export async function settingsTracksPage({ user }) {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Manage Tracks",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  let all = [];
  let active = [];
  let inactive = [];

  await load();
  render();
  bind();

  async function load() {
    all = await readAllTracks(user.uid);
    active = sortByOrder(all.filter((t) => t.isActive !== false));
    inactive = sortByOrder(all.filter((t) => t.isActive === false));
  }

  function sortByOrder(list) {
    return list
      .slice()
      .sort((a, b) => (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0));
  }

  function metaLabel(t) {
    // Calm meta: cadence + unit only
    const cad = t.cadence || "";
    const unit = t.unit ? ` · ${t.unit}` : "";
    return `${cad}${unit}`.trim();
  }

  function privateBadge(track) {
    if (!track?.isPrivate) return "";
    return `<span class="pill">Private</span>`;
  }

  function render() {
    root.innerHTML = Shell({
      title: "Manage Tracks",
      activeTab: "settings",
      content: `
        <section class="card">
          <div class="card-title">Active</div>
          <div class="muted">Hold the handle, then drag to reorder.</div>
          ${
            active.length
              ? `<div class="list" id="activeList">${active
                  .map(renderActiveRow)
                  .join("")}</div>`
              : `<div class="muted" style="margin-top:10px;">No active tracks yet.</div>`
          }
        </section>

        <section class="card">
          <div class="card-title">Inactive</div>
          <div class="muted">Hidden from Today. Re-enable anytime.</div>
          ${
            inactive.length
              ? `<div class="list" id="inactiveList">${inactive
                  .map(renderInactiveRow)
                  .join("")}</div>`
              : `<div class="muted" style="margin-top:10px;">No inactive tracks.</div>`
          }
        </section>

        <!-- FAB + menu -->
        <button class="fab" id="fabTracks" title="Add track">
          <span class="fab-plus">+</span>
        </button>

        <div class="fab-menu hidden" id="fabMenu">
          <button class="fab-item" id="fabCustom">
            <span class="fab-ico">🧩</span>
            <span>Create custom</span>
          </button>
          <button class="fab-item" id="fabTemplates">
            <span class="fab-ico">✨</span>
            <span>Templates</span>
          </button>
        </div>

        <div class="fab-backdrop hidden" id="fabBackdrop"></div>
      `,
    });
  }

  function bind() {
    // Edit
    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const trackId = btn.getAttribute("data-edit");
        navigate(`#/settings/tracks/edit?trackId=${encodeURIComponent(trackId)}`);
      });
    });

    // Toggle active/inactive (switch)
    root.querySelectorAll("[data-toggle]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const trackId = btn.getAttribute("data-toggle");
        const next = btn.getAttribute("data-next") === "true";

        btn.disabled = true;

        try {
          await updateTrack(user.uid, trackId, { isActive: next });
          await load();
          render();
          bind();
        } catch (e) {
          console.error("Toggle failed:", e);
          alert(e?.message || "Could not update track.");
          btn.disabled = false;
        }
      });
    });

    // Delete (only shown in inactive rows)
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const trackId = btn.getAttribute("data-del");
        const t = inactive.find((x) => x.id === trackId);
        if (!t) return;

        const ok = confirm(`Delete "${t.name}"? This cannot be undone.`);
        if (!ok) return;

        // optimistic
        inactive = inactive.filter((x) => x.id !== trackId);
        render();
        bind();

        try {
          await deleteTrack(user.uid, trackId);
          await load();
          render();
          bind();
        } catch (e) {
          console.error("Delete failed:", e);
          alert(e?.message || "Could not delete track.");
          await load();
          render();
          bind();
        }
      });
    });

    // Touch reorder for ACTIVE list only
    setupPointerReorder();

    // FAB menu
    setupFab();
  }

  function renderActiveRow(t) {
    return `
      <div class="track-row" data-id="${t.id}">
        <div class="drag-handle" data-handle="1" title="Hold & drag">≡</div>

        <div class="track-main">
          <div class="track-title">
            ${escapeHtml(t.name)}
            ${privateBadge(t)}
          </div>
          <div class="track-meta muted">${escapeHtml(metaLabel(t))}</div>
        </div>

        <div class="track-actions">
          <button class="icon-btn" data-edit="${t.id}" title="Edit">
            ${pencilSvg()}
          </button>

          <!-- Toggle switch: ON -->
          <button class="switch on" data-toggle="${t.id}" data-next="false" title="Disable"></button>
        </div>
      </div>
    `;
  }

  function renderInactiveRow(t) {
    return `
      <div class="track-row track-row-inactive" data-id="${t.id}">
        <div class="drag-handle drag-handle-disabled" title="Inactive">≡</div>

        <div class="track-main">
          <div class="track-title">
            ${escapeHtml(t.name)}
            ${privateBadge(t)}
          </div>
          <div class="track-meta muted">${escapeHtml(metaLabel(t))}</div>
        </div>

        <div class="track-actions">
          <button class="icon-btn" data-edit="${t.id}" title="Edit">
            ${pencilSvg()}
          </button>

          <button class="icon-btn danger" data-del="${t.id}" title="Delete">
            ${trashSvg()}
          </button>

          <!-- Toggle switch: OFF -->
          <button class="switch" data-toggle="${t.id}" data-next="true" title="Enable"></button>
        </div>
      </div>
    `;
  }

  // FAB menu (create custom / templates)
  function setupFab() {
    const fab = root.querySelector("#fabTracks");
    const menu = root.querySelector("#fabMenu");
    const backdrop = root.querySelector("#fabBackdrop");

    if (!fab || !menu || !backdrop) return;

    const open = () => {
      menu.classList.remove("hidden");
      backdrop.classList.remove("hidden");
      fab.classList.add("fab-open");
    };
    const close = () => {
      menu.classList.add("hidden");
      backdrop.classList.add("hidden");
      fab.classList.remove("fab-open");
    };

    fab.addEventListener("click", () => {
      const isOpen = !menu.classList.contains("hidden");
      if (isOpen) close();
      else open();
    });

    backdrop.addEventListener("click", close);

    const custom = root.querySelector("#fabCustom");
    const templates = root.querySelector("#fabTemplates");

    custom?.addEventListener("click", () => {
      close();
      navigate("#/settings/tracks/new");
    });

    templates?.addEventListener("click", () => {
      close();
      navigate("#/settings/tracks/templates");
    });
  }

  // Pointer-based reorder that works on iOS + Android
  function setupPointerReorder() {
    const list = root.querySelector("#activeList");
    if (!list) return;

    let pressed = false;
    let dragging = false;
    let pressTimer = null;

    let draggedEl = null;
    let placeholder = null;
    let startY = 0;
    let offsetY = 0;

    const stopScroll = (e) => {
      if (dragging) e.preventDefault();
    };

    list.querySelectorAll(".drag-handle").forEach((handle) => {
      handle.addEventListener("pointerdown", (e) => {
        pressed = true;
        dragging = false;
        draggedEl = handle.closest(".track-row");
        if (!draggedEl) return;

        handle.setPointerCapture?.(e.pointerId);

        startY = e.clientY;
        const rect = draggedEl.getBoundingClientRect();
        offsetY = startY - rect.top;

        pressTimer = setTimeout(() => {
          if (!pressed) return;
          beginDrag();
        }, 180);
      });

      handle.addEventListener("pointermove", (e) => {
        if (!pressed) return;
        if (!dragging) return;
        e.preventDefault();
        moveDrag(e.clientY);
      });

      handle.addEventListener("pointerup", async () => {
        pressed = false;
        clearTimeout(pressTimer);

        if (dragging) {
          finishDrag();
          await persistOrder();
        }

        dragging = false;
        draggedEl = null;
      });

      handle.addEventListener("pointercancel", () => {
        pressed = false;
        clearTimeout(pressTimer);
        if (dragging) finishDrag();
        dragging = false;
        draggedEl = null;
      });
    });

    function beginDrag() {
      dragging = true;

      placeholder = document.createElement("div");
      placeholder.className = "drag-placeholder";
      placeholder.style.height = `${draggedEl.getBoundingClientRect().height}px`;

      draggedEl.parentNode.insertBefore(placeholder, draggedEl);

      const rect = draggedEl.getBoundingClientRect();
      draggedEl.classList.add("dragging");
      draggedEl.style.width = `${rect.width}px`;
      draggedEl.style.position = "fixed";
      draggedEl.style.left = `${rect.left}px`;
      draggedEl.style.zIndex = "9999";

      document.addEventListener("touchmove", stopScroll, { passive: false });
      moveDrag(startY);
    }

    function moveDrag(clientY) {
      const y = clientY - offsetY;
      draggedEl.style.top = `${y}px`;

      const rows = [...list.querySelectorAll(".track-row:not(.dragging)")];
      const midY = clientY;

      let insertBefore = null;
      for (const r of rows) {
        const b = r.getBoundingClientRect();
        if (midY < b.top + b.height / 2) {
          insertBefore = r;
          break;
        }
      }

      if (insertBefore) list.insertBefore(placeholder, insertBefore);
      else list.appendChild(placeholder);
    }

    function finishDrag() {
      draggedEl.classList.remove("dragging");
      draggedEl.style.position = "";
      draggedEl.style.top = "";
      draggedEl.style.left = "";
      draggedEl.style.width = "";
      draggedEl.style.zIndex = "";

      list.insertBefore(draggedEl, placeholder);
      placeholder.remove();
      placeholder = null;

      document.removeEventListener("touchmove", stopScroll);
    }

    async function persistOrder() {
      const ids = [...list.querySelectorAll(".track-row")]
        .map((el) => el.getAttribute("data-id"))
        .filter(Boolean);

      active = ids.map((id) => active.find((t) => t.id === id)).filter(Boolean);

      const base = Date.now();
      try {
        await Promise.all(
          active.map((t, idx) =>
            updateTrack(user.uid, t.id, { sortOrder: base + idx * 10 })
          )
        );
        await load();
        render();
        bind();
      } catch (e) {
        console.error(e);
        alert(e?.message || "Could not save order.");
      }
    }
  }

  function pencilSvg() {
    return `
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"></path>
      </svg>
    `;
  }

  function trashSvg() {
    return `
      <svg class="ico" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 6h18"></path>
        <path d="M8 6V4h8v2"></path>
        <path d="M19 6l-1 14H6L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
      </svg>
    `;
  }

  function escapeHtml(s) {
    return String(s || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}
