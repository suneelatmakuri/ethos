// src/pages/authCreatePassword.js
import { createEmailPasswordUser } from "../lib/auth.js";
import { getRoute } from "../router.js";

export function authCreatePasswordPage() {
  const root = document.getElementById("app");
  const { query } = getRoute();
  const email = String(query.get("email") || "").trim().toLowerCase();
  const saved = localStorage.getItem("ethos_keepSignedIn");
  const defaultPersist = saved === null ? true : saved === "true";


  root.innerHTML = `
    <div class="center">
      <h2>Create your account</h2>
      <p class="muted">${email ? `For ${email}` : "Missing email. Go back and enter your email again."}</p>

      <div class="stack">
        <input id="password" class="input" type="password" placeholder="Create password" autocomplete="new-password" />
        <input id="confirm" class="input" type="password" placeholder="Confirm password" autocomplete="new-password" />

        <label class="check">
          <input id="persist" type="checkbox" ${defaultPersist ? "checked" : ""} />
          <span>Keep me signed in</span>
        </label>

        <button id="create" class="btn primary">Create account</button>
        <a class="link" href="#/auth/email">← Back</a>
      </div>

      <div id="msg" class="muted" style="margin-top:12px;"></div>
    </div>
  `;

  const msgEl = root.querySelector("#msg");
  const passEl = root.querySelector("#password");
  const confEl = root.querySelector("#confirm");
  const persistEl = root.querySelector("#persist");

  function setMsg(t) {
    msgEl.textContent = t || "";
  }

  async function onCreate() {
    localStorage.setItem("ethos_keepSignedIn", String(persistEl.checked));
    setMsg("");
    if (!email) return;

    const p1 = String(passEl.value || "");
    const p2 = String(confEl.value || "");

    if (!p1 || p1.length < 6) {
      setMsg("Password should be at least 6 characters.");
      return;
    }
    if (p1 !== p2) {
      setMsg("Passwords do not match.");
      return;
    }

    try {
      await createEmailPasswordUser(email, p1, persistEl.checked);
      // auth gate will route to profile-setup because Firestore profile missing
    } catch (e) {
        const code = e?.code || "";
        // Typical codes:
        // auth/email-already-in-use
        // auth/account-exists-with-different-credential
        if (code === "auth/email-already-in-use" || code === "auth/account-exists-with-different-credential") {
          setMsg("This email is already linked to a different sign-in method. Try Google sign-in.");
          // Optional: bounce them back to email step so it can detect methods
          navigate(`#/auth/email`);
          return;
        }
        setMsg(e?.message || "Account creation failed.");
      }
    }

  root.querySelector("#create").addEventListener("click", onCreate);
  confEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onCreate();
  });
}
