// src/pages/authLanding.js
import { signInWithGoogle } from "../lib/auth.js";
import { navigate } from "../router.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

// Inline SVG icons
const GOOGLE_ICON = `
<svg class="authIcon" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.86-6.86C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.98 6.2C12.3 13.3 17.7 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.1 24.5c0-1.6-.14-2.8-.44-4.1H24v7.8h12.5c-.25 2-1.6 5-4.6 7.1l7.1 5.5c4.2-3.9 7.1-9.6 7.1-16.3z"/>
  <path fill="#FBBC05" d="M10.6 28.6c-.46-1.4-.72-2.9-.72-4.6s.26-3.2.7-4.6l-7.98-6.2C.9 16.7 0 20.2 0 24c0 3.8.9 7.3 2.6 10.6l8-6z"/>
  <path fill="#34A853" d="M24 48c6.4 0 11.8-2.1 15.7-5.7l-7.1-5.5c-1.9 1.3-4.5 2.2-8.6 2.2-6.3 0-11.7-3.8-13.6-9.1l-8 6C6.5 42.6 14.6 48 24 48z"/>
</svg>
`;

const EMAIL_ICON = `
<svg class="authIcon authIcon--mono" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4-8 5-8-5V6l8 5 8-5v2z"/>
</svg>
`;

function applyAuthBg() {
  // keep your existing background system
  document.body.classList.remove("welcome-mode");
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

export function authLandingPage() {
  applyAuthBg();

  const root = document.getElementById("app");

  // keep-signed-in state (same behavior)
  const saved = localStorage.getItem("ethos_keepSignedIn");
  const defaultPersist = saved === null ? true : saved === "true";

  root.innerHTML = `
    <div class="authWrap">
      <a class="authBack" href="#/welcome">← Back</a>

      <div class="authBlock">
        <div class="authTitle">LOGIN</div>

        <div class="authStack">
          <button id="googleBtn" class="authBtn" type="button">
            ${GOOGLE_ICON}
            <span>Continue with Google</span>
          </button>

          <button id="emailBtn" class="authBtn" type="button">
            ${EMAIL_ICON}
            <span>Continue with Email</span>
          </button>

          <label class="authCheck">
            <input id="persist" type="checkbox" ${defaultPersist ? "checked" : ""} />
            <span>Keep me signed in</span>
          </label>

          <div id="msg" class="authMsg"></div>
        </div>
      </div>
    </div>
  `;

  const msgEl = root.querySelector("#msg");
  const persistEl = root.querySelector("#persist");

  persistEl.addEventListener("change", () => {
    localStorage.setItem("ethos_keepSignedIn", String(persistEl.checked));
  });

  root.querySelector("#emailBtn").addEventListener("click", () => {
    navigate("#/auth/email");
  });

  root.querySelector("#googleBtn").addEventListener("click", async () => {
    msgEl.textContent = "";
    try {
      await signInWithGoogle(persistEl.checked);
    } catch (e) {
      msgEl.textContent = e?.message || "Google sign-in failed";
    }
  });
}
