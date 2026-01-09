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
        <div class="card-title">Account</div>
        <button id="logout" class="btn">Logout</button>
      </section>

      <section class="card">
        <div class="card-title">Preferences (later)</div>
        <div class="muted">Timezone, manage tracks, etc.</div>
      </section>
    `,
  });

  root.querySelector("#logout").addEventListener("click", async () => {
    await signOut();
    navigate("#/auth");
  });
}
