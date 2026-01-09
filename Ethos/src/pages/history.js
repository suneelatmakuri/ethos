// src/pages/history.js
import { Shell } from "../components/shell.js";

export function historyPage() {
  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "History",
    activeTab: "history",
    content: `
      <section class="card">
        <div class="card-title">Reflection (stub)</div>
        <div class="muted">Calendar/list view comes next.</div>
      </section>
    `,
  });
}
