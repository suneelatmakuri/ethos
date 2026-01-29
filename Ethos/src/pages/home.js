// src/pages/home.js
import { Shell } from "../components/shell.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

function applyHomeBg() {
  // Keep the same background vibe from auth pages
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

function pickName(user, profile) {
  const fromProfile = (profile?.displayName || "").trim();
  if (fromProfile) return fromProfile;

  const fromAuth = (user?.displayName || "").trim();
  if (fromAuth) return fromAuth;

  const email = (user?.email || "").trim();
  if (email && email.includes("@")) return email.split("@")[0];

  return "there";
}

export function homePage({ user, profile }) {
  applyHomeBg();

  const name = pickName(user, profile);

  const root = document.getElementById("app");
  root.innerHTML = Shell({
    title: "Home",
    activeTab: "home",
    content: `
      <section class="userWrap">
        <div class="userHero">
          <div class="userName">${escapeHtml(name)}</div>
          <div class="userPrompt">How are you doing today?</div>
        </div>
      </section>
    `,
  });
}

// tiny safety (avoid breaking if name has < > etc)
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
