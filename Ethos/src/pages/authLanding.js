// src/pages/authLanding.js
import { signInWithGoogle } from "../lib/auth.js";
import { navigate } from "../router.js";

export function authLandingPage() {
  const root = document.getElementById("app");

  root.innerHTML = `
    <div class="center">
      <h1>Ethos</h1>
      <p class="muted">A calm place to stay aligned.</p>

      <label class="check">
        <input id="persist" type="checkbox" checked />
        <span>Keep me signed in</span>
      </label>

      <div class="stack">
        <button id="googleBtn" class="btn primary">Continue with Google</button>
        <button id="emailBtn" class="btn">Continue with Email</button>
      </div>
    </div>
  `;

  const persistEl = root.querySelector("#persist");

  // load saved pref
  const saved = localStorage.getItem("ethos_keepSignedIn");
  if (saved !== null) persistEl.checked = saved === "true";

  persistEl.addEventListener("change", () => {
    localStorage.setItem("ethos_keepSignedIn", String(persistEl.checked));
  });

  root.querySelector("#emailBtn").addEventListener("click", () => {
    navigate("#/auth/email");
  });

  root.querySelector("#googleBtn").addEventListener("click", async () => {
    try {
      await signInWithGoogle(persistEl.checked);
      // auth observer will redirect
    } catch (e) {
      alert(e?.message || "Google sign-in failed");
    }
  });
}
