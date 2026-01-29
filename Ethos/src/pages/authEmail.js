// src/pages/authEmail.js
import { getEmailMethods, signInWithGoogle } from "../lib/auth.js";
import { navigate } from "../router.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

const GOOGLE_ICON = `
<svg class="authIcon" viewBox="0 0 48 48" aria-hidden="true">
  <path fill="#EA4335" d="M24 9.5c3.54 0 6.7 1.22 9.2 3.6l6.86-6.86C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.98 6.2C12.3 13.3 17.7 9.5 24 9.5z"/>
  <path fill="#4285F4" d="M46.1 24.5c0-1.6-.14-2.8-.44-4.1H24v7.8h12.5c-.25 2-1.6 5-4.6 7.1l7.1 5.5c4.2-3.9 7.1-9.6 7.1-16.3z"/>
  <path fill="#FBBC05" d="M10.6 28.6c-.46-1.4-.72-2.9-.72-4.6s.26-3.2.7-4.6l-7.98-6.2C.9 16.7 0 20.2 0 24c0 3.8.9 7.3 2.6 10.6l8-6z"/>
  <path fill="#34A853" d="M24 48c6.4 0 11.8-2.1 15.7-5.7l-7.1-5.5c-1.9 1.3-4.5 2.2-8.6 2.2-6.3 0-11.7-3.8-13.6-9.1l-8 6C6.5 42.6 14.6 48 24 48z"/>
</svg>
`;

function applyAuthBg() {
  document.body.classList.remove("welcome-mode");
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

export function authEmailPage() {
  applyAuthBg();

  const root = document.getElementById("app");

  root.innerHTML = `
    <div class="authWrap">
      <a class="authBack" href="#/auth">← Back</a>

      <div class="authBlock">
        <div class="authTitle">LOGIN</div>

        <div class="authStack">
          <input id="email" class="input" type="email" placeholder="you@example.com" autocomplete="email" />

          <button id="next" class="authBtn" type="button">
            <span>Next</span>
            <span aria-hidden="true" style="opacity:.8;margin-left:2px;">→</span>
          </button>

          <div id="msg" class="authMsg"></div>

          <div id="googleHint" style="display:none;">
            <button id="googleBtn" class="authBtn" type="button">
              ${GOOGLE_ICON}
              <span>Continue with Google</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  const emailEl = root.querySelector("#email");
  const msgEl = root.querySelector("#msg");
  const googleHintEl = root.querySelector("#googleHint");

  function setMsg(text) {
    msgEl.textContent = text || "";
  }

  async function onNext() {
    const email = String(emailEl.value || "").trim().toLowerCase();
    setMsg("");
    googleHintEl.style.display = "none";

    if (!email) {
      setMsg("Please enter an email.");
      return;
    }

    try {
      const methods = await getEmailMethods(email);

      if (!methods || methods.length === 0) {
        navigate(`#/auth/create-password?email=${encodeURIComponent(email)}`);
        return;
      }

      const hasGoogle = methods.includes("google.com");
      const hasPassword = methods.includes("password");

      if (hasGoogle && !hasPassword) {
        setMsg("This email is linked to Google sign-in.");
        googleHintEl.style.display = "block";
        return;
      }

      if (hasPassword) {
        navigate(`#/auth/password?email=${encodeURIComponent(email)}`);
        return;
      }

      setMsg("This email uses a different sign-in method. Try Google sign-in.");
      googleHintEl.style.display = "block";
    } catch (e) {
      setMsg(e?.message || "Could not check sign-in method.");
    }
  }

  root.querySelector("#next").addEventListener("click", onNext);
  emailEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onNext();
  });

  root.querySelector("#googleBtn").addEventListener("click", async () => {
    try {
      await signInWithGoogle();
    } catch (e) {
      setMsg(e?.message || "Google sign-in failed");
    }
  });
}
