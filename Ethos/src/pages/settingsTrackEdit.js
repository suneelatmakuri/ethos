// src/pages/settingsTrackEdit.js
import { Shell } from "../components/shell.js";
import { navigate, getRoute } from "../router.js";
// import { updateTrack, deleteTrack } from "../lib/ethosDb.js";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { readActiveTracks, createTrack, updateTrack, deleteTrack } from "../lib/db.js";


function getQueryParam(name) {
  const { path } = getRoute();
  const idx = path.indexOf("?");
  if (idx === -1) return null;
  const qs = new URLSearchParams(path.slice(idx + 1));
  return qs.get(name);
}

export async function settingsTrackEditPage({ user, mode }) {
  const root = document.getElementById("app");
  const trackId = getQueryParam("trackId");

  if (mode === "edit" && !trackId) {
    navigate("#/settings/tracks");
    return;
  }

  root.innerHTML = Shell({
    title: "Track",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  let track = null;

  if (mode === "edit") {
    const ref = doc(db, "users", user.uid, "tracks", trackId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      navigate("#/settings/tracks");
      return;
    }
    track = { id: snap.id, ...snap.data() };
  } else {
    // basic defaults for new track
    track = {
      name: "",
      type: "COUNTER_INCREMENT",
      cadence: "daily",
      unit: "",
      isActive: true,
      sortOrder: Date.now(),
      target: { mode: "value", value: 0 },
      config: { incrementStep: 1 },
    };
  }

  root.innerHTML = Shell({
    title: mode === "edit" ? "Edit Track" : "New Track",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">${mode === "edit" ? "Edit track" : "Create a track"}</div>
            <div class="muted">Keep it simple. You can refine later.</div>
          </div>
          <button class="btn" id="back">Back</button>
        </div>

        <div class="form" style="margin-top:12px;">
          <label class="field">
            <div class="label">Name</div>
            <input class="input" id="name" value="${track.name || ""}" placeholder="Water / Steps / Journal…" />
          </label>

          <div class="row" style="gap:12px;flex-wrap:wrap;">
            <label class="field" style="min-width:220px;">
              <div class="label">Type</div>
              <select class="select" id="type">
                ${["COUNTER_INCREMENT","BOOLEAN","NUMBER_REPLACE","TEXT_APPEND","DROPDOWN_EVENT"]
                  .map((t) => `<option value="${t}" ${track.type === t ? "selected" : ""}>${t}</option>`)
                  .join("")}
              </select>
            </label>

            <label class="field" style="min-width:220px;">
              <div class="label">Cadence</div>
              <select class="select" id="cadence">
                ${["daily","weekly","monthly"]
                  .map((c) => `<option value="${c}" ${track.cadence === c ? "selected" : ""}>${c}</option>`)
                  .join("")}
              </select>
            </label>

            <label class="field" style="min-width:220px;">
              <div class="label">Unit</div>
              <input class="input" id="unit" value="${track.unit || ""}" placeholder="ml / steps / kg / times" />
            </label>
          </div>

          <div class="row" style="gap:12px;flex-wrap:wrap;">
            <label class="field" style="min-width:220px;">
              <div class="label">Target mode</div>
              <select class="select" id="targetMode">
                <option value="value" ${track.target?.mode === "value" ? "selected" : ""}>value</option>
                <option value="count" ${track.target?.mode === "count" ? "selected" : ""}>count</option>
              </select>
            </label>

            <label class="field" style="min-width:220px;">
              <div class="label">Target value</div>
              <input class="input" id="targetValue" type="number" value="${Number(track.target?.value || 0)}" />
            </label>

            <label class="field" style="min-width:220px;">
              <div class="label">Active</div>
              <select class="select" id="isActive">
                <option value="true" ${track.isActive ? "selected" : ""}>true</option>
                <option value="false" ${!track.isActive ? "selected" : ""}>false</option>
              </select>
            </label>
          </div>

          <section class="card" style="margin:12px 0;">
            <div class="card-title">Type config (MVP)</div>
            <div class="muted">We’ll make this dynamic per type in the next pass.</div>

            <div class="row" style="gap:12px;flex-wrap:wrap;margin-top:10px;">
              <label class="field" style="min-width:220px;">
                <div class="label">incrementStep (COUNTER_INCREMENT)</div>
                <input class="input" id="incrementStep" type="number"
                  value="${Number(track.config?.incrementStep || 1)}" />
              </label>

              <label class="field" style="min-width:220px;">
                <div class="label">booleanMode (BOOLEAN)</div>
                <select class="select" id="booleanMode">
                  <option value="done_only" ${(track.config?.booleanMode || "done_only") === "done_only" ? "selected" : ""}>done_only</option>
                  <option value="count" ${(track.config?.booleanMode || "") === "count" ? "selected" : ""}>count</option>
                </select>
              </label>

              <label class="field" style="min-width:220px;">
                <div class="label">precision (NUMBER_REPLACE)</div>
                <input class="input" id="precision" type="number" step="0.1"
                  value="${Number(track.config?.precision ?? 1)}" />
              </label>
            </div>
          </section>

          <div class="row" style="justify-content:flex-end;gap:8px;">
            ${mode === "edit" ? `<button class="btn danger" id="del">Delete</button>` : ""}
            <button class="btn primary" id="save">Save</button>
          </div>
        </div>
      </section>
    `,
  });

  root.querySelector("#back").addEventListener("click", () => navigate("#/settings/tracks"));

  root.querySelector("#save").addEventListener("click", async () => {
    const name = root.querySelector("#name").value.trim();
    if (!name) return alert("Name is required.");

    const type = root.querySelector("#type").value;
    const cadence = root.querySelector("#cadence").value;
    const unit = root.querySelector("#unit").value.trim();

    const targetMode = root.querySelector("#targetMode").value;
    const targetValue = Number(root.querySelector("#targetValue").value || 0);

    const isActive = root.querySelector("#isActive").value === "true";

    const incrementStep = Number(root.querySelector("#incrementStep").value || 1);
    const booleanMode = root.querySelector("#booleanMode").value;
    const precision = Number(root.querySelector("#precision").value || 1);

    const patch = {
      name,
      type,
      cadence,
      unit,
      isActive,
      target: { mode: targetMode, value: targetValue },
      config: {
        ...(track.config || {}),
        incrementStep,
        booleanMode,
        precision,
      },
    };

    if (mode === "edit") {
        await updateTrack(user.uid, trackId, patch);
      } else {
        await createTrack(user.uid, patch);
      }      

    alert("Saved.");
    navigate("#/settings/tracks");
  });

  root.querySelector("#del")?.addEventListener("click", async () => {
    if (!confirm("Delete this track? This won’t delete past entries.")) return;
    await deleteTrack(user.uid, trackId);
    navigate("#/settings/tracks");
  });
}
