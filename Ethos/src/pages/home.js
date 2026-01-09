// src/pages/home.js
import { Shell } from "../components/shell.js";

export function homePage() {
  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Home",
    activeTab: "home",
    content: `
      <section class="card">
        <div class="card-title">How are you doing today?</div>
        <div class="muted">A gentle glance. No pressure.</div>
      </section>

      <section class="card">
        <div class="card-title">Pinned targets (stub)</div>
        <div class="muted">Example: 8,000 / 15,000 steps</div>
        <div class="muted">Example: 1.5L / 3L water</div>
        <div class="muted">Example: 3 / 6 sessions this week</div>
      </section>
    `,
  });
}
