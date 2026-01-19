// src/pages/settings.js
import { Shell } from "../components/shell.js";
import { signOut } from "../lib/auth.js";
import { navigate } from "../router.js";

export function settingsPage() {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Settings",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="card-title">Settings</div>

        <div class="list">
          <button class="list-item" id="goProfile" type="button">
            <div>
              <div class="li-title">Profile</div>
              <div class="muted">Name, DOB, timezone</div>
            </div>
            <div class="chev">›</div>
          </button>

          <button class="list-item" id="goTheme" type="button">
            <div>
              <div class="li-title">Theme</div>
              <div class="muted">Mode + accent colors</div>
            </div>
            <div class="chev">›</div>
          </button>

          <button class="list-item" id="goTracks" type="button">
            <div>
              <div class="li-title">Manage Tracks</div>
              <div class="muted">Add, edit, reorder, activate/deactivate</div>
            </div>
            <div class="chev">›</div>
          </button>
        </div>
      </section>

      <section class="card">
        <div class="card-title">Account</div>
        <button id="logout" class="btn" type="button">Logout</button>
      </section>
    `,
  });

  root.querySelector("#goProfile").addEventListener("click", () => navigate("#/settings/profile"));
  root.querySelector("#goTheme").addEventListener("click", () => navigate("#/settings/theme"));
  root.querySelector("#goTracks").addEventListener("click", () => navigate("#/settings/tracks"));

  root.querySelector("#logout").addEventListener("click", async () => {
    await signOut();
    navigate("#/auth");
  });
}
