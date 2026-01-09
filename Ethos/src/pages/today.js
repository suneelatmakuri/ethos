// src/pages/today.js
import { Shell } from "../components/shell.js";

export function todayPage() {
  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Today",
    activeTab: "today",
    content: `
      <section class="card">
        <div class="card-title">Check-in (stub)</div>
        <div class="muted">This will be the “do/log” page.</div>
      </section>
    `,
  });
}
