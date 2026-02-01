// src/components/tabs.js
function icon(name) {
  const icons = {
    trophy: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 21h8M12 17v4M7 4h10v3a5 5 0 0 1-10 0V4Z"/><path d="M17 7h3a4 4 0 0 1-4 4M7 7H4a4 4 0 0 0 4 4"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>`,
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1V10.5Z"/></svg>`,
    history: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/><path d="M12 7v6l4 2"/></svg>`,
    gear: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="M19.4 15a7.8 7.8 0 0 0 .1-6l2-1.2-2-3.5-2.3.7a8 8 0 0 0-5-2.9L12 0h-4l-.9 2.1a8 8 0 0 0-5 2.9l-2.3-.7-2 3.5 2 1.2a7.8 7.8 0 0 0 .1 6l-2 1.2 2 3.5 2.3-.7a8 8 0 0 0 5 2.9L8 24h4l.9-2.1a8 8 0 0 0 5-2.9l2.3.7 2-3.5-2-1.2Z"/></svg>`,
  };
  return icons[name] || "";
}

export function Tabs({ active }) {
  const items = [
    { id: "leaderboard", label: "Leaderboard", href: "#/leaderboard", icon: "trophy" },
    { id: "today", label: "Today", href: "#/today", icon: "check" },
    { id: "home", label: "Home", href: "#/home", icon: "home" },
    { id: "history", label: "Reflections", href: "#/history", icon: "history" },
    { id: "settings", label: "Settings", href: "#/settings", icon: "gear" },
  ];

  return `
    <nav class="tabs" role="navigation" aria-label="Primary">
      ${items
        .map(
          (it) => `
          <a
            class="tab ${active === it.id ? "active" : ""}"
            data-id="${it.id}"
            href="${it.href}"
            aria-label="${it.label}"
            ${active === it.id ? `aria-current="page"` : ""}
          >
            <span class="tab-ico">${icon(it.icon)}</span>
            <span class="tab-txt">${it.label}</span>
          </a>
        `
        )
        .join("")}
    </nav>
  `;
}
