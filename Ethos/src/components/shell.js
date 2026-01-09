// src/components/shell.js
import { Tabs } from "./tabs.js";

export function Shell({ title, activeTab, content }) {
  return `
    <div class="app">
      <header class="header">
        <div class="header-title">${title || "Ethos"}</div>
      </header>

      <main class="content">
        ${content || ""}
      </main>

      ${Tabs({ active: activeTab })}
    </div>
  `;
}
