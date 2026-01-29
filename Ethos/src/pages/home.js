// src/pages/home.js
import { Shell } from "../components/shell.js";

// const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;
const HOME_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

function applyHomeBg() {
  // REMOVE any previous modes
  document.body.classList.remove("welcome-mode");
  document.body.classList.remove("auth-bg");

  // clean leftover vars
  document.body.style.removeProperty("--authBgUrl");
  document.body.style.removeProperty("--publicBgUrl");

  // APPLY home mode
  document.body.classList.add("home-bg");
  document.body.style.setProperty("--homeBgUrl", `url("${HOME_BG}")`);
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
