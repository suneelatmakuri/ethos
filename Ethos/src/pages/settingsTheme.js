// src/pages/settingsTheme.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import { getUserProfile } from "../lib/db.js";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";
import { applyThemeFromProfile, normalizePrefs } from "../lib/theme.js";

export async function settingsThemePage({ user }) {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Theme",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  const profile = await getUserProfile(user.uid);
  const prefs = normalizePrefs(profile?.preferences);

  root.innerHTML = Shell({
    title: "Theme",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">Theme</div>
            <div class="muted">Set the vibe. Keep it calm.</div>
          </div>
          <button class="btn" id="back" type="button">Back</button>
        </div>

        <div class="form" style="margin-top:12px;">
          <label class="field">
            <div class="label">Mode</div>
            <select class="select" id="themeMode">
              <option value="system" ${prefs.themeMode === "system" ? "selected" : ""}>System</option>
              <option value="light" ${prefs.themeMode === "light" ? "selected" : ""}>Light</option>
              <option value="dark" ${prefs.themeMode === "dark" ? "selected" : ""}>Dark</option>
            </select>
          </label>

          <div class="row" style="gap:14px;flex-wrap:wrap;align-items:center;">
            <label class="field" style="min-width:200px;">
              <div class="label">Accent 1</div>
              <input class="input" id="accent1" type="color" value="${prefs.accent1}" />
            </label>

            <label class="field" style="min-width:200px;">
              <div class="label">Accent 2</div>
              <input class="input" id="accent2" type="color" value="${prefs.accent2}" />
            </label>
          </div>

          <div class="row" style="justify-content:flex-end;gap:8px;">
            <button class="btn primary" id="save" type="button">Save</button>
          </div>

          <div class="mini muted" id="status" style="min-height:18px;"></div>
        </div>
      </section>
    `,
  });

  root.querySelector("#back").addEventListener("click", () => navigate("#/settings"));

  root.querySelector("#save").addEventListener("click", async () => {
    const status = root.querySelector("#status");
    status.textContent = "Saving…";

    const themeMode = root.querySelector("#themeMode").value;
    const accent1 = root.querySelector("#accent1").value;
    const accent2 = root.querySelector("#accent2").value;

    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        preferences: { themeMode, accent1, accent2 },
        updatedAt: serverTimestamp(),
      });

      const updated = await getUserProfile(user.uid);
      applyThemeFromProfile(updated);

      status.textContent = "Saved.";
      setTimeout(() => (status.textContent = ""), 1200);
    } catch (e) {
      console.error("Theme save failed:", e);
      status.textContent = `Save failed: ${e?.message || e}`;
      alert(`Theme save failed:\n${e?.message || e}`);
    }
  });
}
