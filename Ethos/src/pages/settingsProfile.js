// src/pages/settingsProfile.js
import { Shell } from "../components/shell.js";
import { navigate } from "../router.js";
import { getUserProfile } from "../lib/db.js";
import { updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase.js";

function getTimeZoneOptions() {
  // Supported in modern browsers; fallback to common list if not available
  try {
    if (typeof Intl.supportedValuesOf === "function") {
      return Intl.supportedValuesOf("timeZone");
    }
  } catch {}
  return [
    "Asia/Kolkata",
    "Asia/Dubai",
    "Europe/London",
    "Europe/Berlin",
    "America/New_York",
    "America/Los_Angeles",
    "Australia/Sydney",
  ];
}

export async function settingsProfilePage({ user }) {
  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "Profile",
    activeTab: "settings",
    content: `<div class="center"><p class="muted">Loading…</p></div>`,
  });

  const profile = await getUserProfile(user.uid);
  const tzOptions = getTimeZoneOptions();

  root.innerHTML = Shell({
    title: "Profile",
    activeTab: "settings",
    content: `
      <section class="card">
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <div class="card-title">Profile</div>
            <div class="muted">Personal details for your Ethos space</div>
          </div>
          <button class="btn" id="back" type="button">Back</button>
        </div>

        <div class="form" style="margin-top:12px;">
          <label class="field">
            <div class="label">Display name</div>
            <input class="input" id="displayName" value="${profile?.displayName || ""}" placeholder="Your name" />
          </label>

          <label class="field">
            <div class="label">DOB (optional)</div>
            <input class="input" id="dob" type="date" value="${profile?.dob || ""}" />
          </label>

          <label class="field">
            <div class="label">Time zone</div>
            <input class="input" id="timeZone" list="tzList" value="${profile?.timeZone || "Asia/Kolkata"}" />
            <datalist id="tzList">
              ${tzOptions.slice(0, 500).map((z) => `<option value="${z}"></option>`).join("")}
            </datalist>
            <div class="mini muted">Tip: start typing “Asia/…” and pick from suggestions.</div>
          </label>

          <div class="row" style="justify-content:flex-end;gap:8px;">
            <button class="btn primary" id="save" type="button">Save</button>
          </div>

          <div class="mini muted" id="status" style="min-height:18px;"></div>
        </div>
      </section>
    `,
  });

  root.querySelector("#back").addEventListener("click", () => navigate("#/settings"));

  root.querySelector("#save").addEventListener("click", async () => {
    const status = root.querySelector("#status");
    status.textContent = "Saving…";

    const displayName = root.querySelector("#displayName").value.trim();
    const dob = root.querySelector("#dob").value || null;
    const timeZone = root.querySelector("#timeZone").value.trim() || "Asia/Kolkata";

    try {
      const ref = doc(db, "users", user.uid);
      await updateDoc(ref, {
        displayName,
        dob,
        timeZone,
        updatedAt: serverTimestamp(),
      });

      status.textContent = "Saved.";
      setTimeout(() => (status.textContent = ""), 1200);
    } catch (e) {
      console.error("Profile save failed:", e);
      status.textContent = `Save failed: ${e?.message || e}`;
      alert(`Profile save failed:\n${e?.message || e}`);
    }
  });
}
