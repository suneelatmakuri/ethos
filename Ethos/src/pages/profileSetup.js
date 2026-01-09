// src/pages/profileSetup.js
import { createUserProfile } from "../lib/db.js";
import { navigate } from "../router.js";

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
  const root = document.getElementById("app");
  const tzList = getTimezones();
  const guessTz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kolkata";

  root.innerHTML = `
    <div class="center">
      <h2>Set up your profile</h2>
      <p class="muted">This helps Ethos keep your days aligned to your timezone.</p>

      <div class="stack">
        <label class="label">Display name</label>
        <input id="name" class="input" type="text" placeholder="What should we call you?" />

        <label class="label">Date of birth</label>
        <input id="dob" class="input" type="date" />

        <label class="label">Timezone</label>
        <select id="tz" class="input">
          ${tzList
            .map((tz) => `<option value="${tz}" ${tz === guessTz ? "selected" : ""}>${tz}</option>`)
            .join("")}
        </select>

        <button id="save" class="btn primary">Save</button>
      </div>

      <div id="msg" class="muted" style="margin-top:12px;"></div>
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

      navigate("#/home");
    } catch (e) {
      setMsg(e?.message || "Could not save profile.");
    }
  });
}
