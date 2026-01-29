// src/pages/authCreatePassword.js
import { createEmailPasswordUser } from "../lib/auth.js";
import { getRoute, navigate } from "../router.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

function applyAuthBg() {
  document.body.classList.remove("welcome-mode");
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

export function authCreatePasswordPage() {
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
          <input id="password" class="input" type="password" placeholder="Create password" autocomplete="new-password" />
          <input id="confirm" class="input" type="password" placeholder="Confirm password" autocomplete="new-password" />

          <label class="authCheck">
            <input id="persist" type="checkbox" ${defaultPersist ? "checked" : ""} />
            <span>Keep me signed in</span>
          </label>

          <button id="create" class="authBtn" type="button">Create account</button>

          <div id="msg" class="authMsg"></div>
        </div>
      </div>
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
      if (
        code === "auth/email-already-in-use" ||
        code === "auth/account-exists-with-different-credential"
      ) {
        setMsg("This email is already linked to a different sign-in method. Try Google sign-in.");
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
