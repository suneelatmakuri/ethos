// src/pages/authPassword.js
import { signInWithEmailPassword, sendPasswordReset } from "../lib/auth.js";
import { getRoute } from "../router.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

function applyAuthBg() {
  document.body.classList.remove("welcome-mode");
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

export function authPasswordPage() {
  applyAuthBg();

  const root = document.getElementById("app");
  const { query } = getRoute();
  const email = String(query.get("email") || "").trim().toLowerCase();

  const saved = localStorage.getItem("ethos_keepSignedIn");
  const defaultPersist = saved === null ? true : saved === "true";

  root.innerHTML = `
    <div class="authWrap">
      <a class="authBack" href="#/auth/email">← Back</a>

      <div class="authBlock">
        <div class="authTitle">LOGIN</div>

        <div class="authStack">
          <input id="password" class="input" type="password" placeholder="Password" autocomplete="current-password" />

          <label class="authCheck">
            <input id="persist" type="checkbox" ${defaultPersist ? "checked" : ""} />
            <span>Keep me signed in</span>
          </label>

          <button id="login" class="authBtn" type="button">Sign in</button>

          <button id="forgot" type="button"
            style="background:transparent;border:0;color:rgba(255,255,255,0.72);cursor:pointer;justify-self:center;">
            Forgot password?
          </button>

          <a href="#/auth/email"
            style="color:rgba(255,255,255,0.72);text-decoration:none;justify-self:center;">
            ← Use a different email
          </a>

          <div id="msg" class="authMsg"></div>
        </div>
      </div>
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
