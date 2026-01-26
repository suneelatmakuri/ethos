import { Shell } from "../components/shell.js";

export function settingsTrackTemplatesPage() {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Templates",
    activeTab: "settings",
    content: `
      <div class="center">
        <div class="card" style="text-align:center;padding:22px;">
          <div style="font-size:42px; margin-bottom:10px;">⚙️</div>
          <div style="font-weight:700; font-size:18px;">Coming soon</div>
          <div class="muted" style="margin-top:6px;">
            Track templates will live here — one tap to add.
          </div>
        </div>
      </div>
    `,
  });
}
