// src/pages/profileSetup.js
import { createUserProfile } from "../lib/db.js";
import { navigate } from "../router.js";

const AUTH_BG = `${import.meta.env.BASE_URL}assets/auth-bg.png`;

function applyAuthBg() {
  document.body.classList.remove("welcome-mode");
  document.body.classList.add("auth-bg");
  document.body.style.setProperty("--authBgUrl", `url("${AUTH_BG}")`);
}

function getTimezones() {
  // Modern browsers
  if (typeof Intl !== "undefined" && typeof Intl.supportedValuesOf === "function") {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch (_) {}
  }
  // Fallback small list (expand later)
  return [
    "Asia/Kolkata",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Los_Angeles",
    "Australia/Sydney",
    "Asia/Singapore",
    "Asia/Tokyo",
  ];
}

export function profileSetupPage({ user }) {
  applyAuthBg();

  const root = document.getElementById("app");
  const tzList = getTimezones();
  const guessTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  root.innerHTML = `
    <div class="authWrap">
      <a class="authBack" href="#/auth">← Back</a>

      <div class="authBlock">
        <div class="authTitle">PROFILE</div>

        <div class="authStack">
          <input id="name" class="input" type="text" placeholder="Display name (optional)" autocomplete="name" />
          <input id="dob" class="input" type="date" />

          <select id="tz" class="input">
            ${tzList
              .map((tz) => `<option value="${tz}" ${tz === guessTz ? "selected" : ""}>${tz}</option>`)
              .join("")}
          </select>

          <button id="save" class="authBtn" type="button">Save</button>

          <div id="msg" class="authMsg"></div>
        </div>
      </div>
    </div>
  `;

  const msgEl = root.querySelector("#msg");
  const nameEl = root.querySelector("#name");
  const dobEl = root.querySelector("#dob");
  const tzEl = root.querySelector("#tz");

  function setMsg(t) {
    msgEl.textContent = t || "";
  }

  root.querySelector("#save").addEventListener("click", async () => {
    setMsg("");

    const displayName = String(nameEl.value || "").trim();
    const dob = String(dobEl.value || "").trim(); // YYYY-MM-DD
    const timeZone = String(tzEl.value || "").trim();

    if (!timeZone) {
      setMsg("Please select a timezone.");
      return;
    }

    try {
      await createUserProfile(user.uid, {
        email: user.email || "",
        displayName: displayName || "",
        dob: dob || "",
        timeZone,
        weekStartsOn: "monday", // locked decision
        role: "user",
      });

      window.location.hash = "#/home";
      window.location.reload();
    } catch (e) {
      setMsg(e?.message || "Could not save profile.");
    }
  });
}
