import { Shell } from "../components/shell.js";

export function leaderboardPage() {
  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Leaderboard",
    activeTab: "leaderboard",
    content: `
      <section class="card">
        <div class="card-title">Leaderboard (stub)</div>
        <div class="muted">We’ll wire this after data model is locked.</div>
      </section>
    `,
  });
}
