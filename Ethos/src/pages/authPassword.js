// src/pages/authPassword.js
import { signInWithEmailPassword, sendPasswordReset } from "../lib/auth.js";
import { getRoute, navigate } from "../router.js";

export function authPasswordPage() {
  const root = document.getElementById("app");
  const { query } = getRoute();
  const email = String(query.get("email") || "").trim().toLowerCase();
  const saved = localStorage.getItem("ethos_keepSignedIn");
  const defaultPersist = saved === null ? true : saved === "true";


  root.innerHTML = `
    <div class="center">
      <h2>Welcome back</h2>
      <p class="muted">${email ? `Signing in as ${email}` : "Enter your password to continue."}</p>

      <div class="stack">
        <input id="password" class="input" type="password" placeholder="Password" autocomplete="current-password" />
        
        <label class="check">
          <input id="persist" type="checkbox" ${defaultPersist ? "checked" : ""} />
          <span>Keep me signed in</span>
        </label>

        <button id="login" class="btn primary">Sign in</button>

        <button id="forgot" class="btn ghost">Forgot password?</button>
        <a class="link" href="#/auth/email">← Use a different email</a>
      </div>

      <div id="msg" class="muted" style="margin-top:12px;"></div>
    </div>
  `;

  const msgEl = root.querySelector("#msg");
  const passEl = root.querySelector("#password");
  const persistEl = root.querySelector("#persist");

  function setMsg(t) {
    msgEl.textContent = t || "";
  }

  if (!email) setMsg("Missing email. Go back and enter your email again.");

  async function onLogin() {
    localStorage.setItem("ethos_keepSignedIn", String(persistEl.checked));
    setMsg("");
    if (!email) return;

    const password = String(passEl.value || "");
    if (!password) {
      setMsg("Please enter your password.");
      return;
    }

    try {
      await signInWithEmailPassword(email, password, persistEl.checked);
      // auth gate will redirect
    } catch (e) {
      setMsg(e?.message || "Sign-in failed.");
    }
  }

  root.querySelector("#login").addEventListener("click", onLogin);
  passEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onLogin();
  });

  root.querySelector("#forgot").addEventListener("click", async () => {
    setMsg("");
    if (!email) return;

    try {
      await sendPasswordReset(email);
      setMsg("Password reset email sent.");
    } catch (e) {
      setMsg(e?.message || "Could not send reset email.");
    }
  });
}
