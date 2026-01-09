// src/pages/authEmail.js
import { getEmailMethods, signInWithGoogle } from "../lib/auth.js";
import { navigate } from "../router.js";

export function authEmailPage() {
  const root = document.getElementById("app");

  root.innerHTML = `
    <div class="center">
      <h2>Continue with Email</h2>
      <p class="muted">Enter your email to continue.</p>

      <div class="stack">
        <input id="email" class="input" type="email" placeholder="you@example.com" autocomplete="email" />
        <button id="next" class="btn primary">Next →</button>
        <a class="link" href="#/auth">← Back</a>
      </div>

      <div id="msg" class="muted" style="margin-top:12px;"></div>
      <div id="googleHint" class="stack" style="margin-top:12px; display:none;">
        <button id="googleBtn" class="btn">Continue with Google instead</button>
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

      // Typical outcomes:
      // [] -> not registered -> create password
      // ["password"] -> password login
      // ["google.com"] -> must use google
      // sometimes multiple -> pick best UX
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

      // If password exists (even if google also exists), let user use password route
      if (hasPassword) {
        navigate(`#/auth/password?email=${encodeURIComponent(email)}`);
        return;
      }

      // fallback: if unknown method
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
