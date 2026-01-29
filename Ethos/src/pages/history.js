import { Shell } from "../components/shell.js";

/**
 * EDIT THESE TWO ONLY
 * (ISO strings are safest because they preserve your timezone)
 */
const START_AT_ISO = "2026-01-31T00:00:00+05:30";
const LAUNCH_AT_ISO = "2026-02-13T12:00:00+05:30";

/**
 * Image path:
 * Use BASE_URL so it works in dev AND if your app base is not "/"
 * (Vite sets import.meta.env.BASE_URL)
 */
const HERO_IMAGE_SRC = `${import.meta.env.BASE_URL}assets/leaderboard-construction.png`;

// -------------------- helpers --------------------
function clamp(n, a, b) {
  return Math.min(b, Math.max(a, n));
}

function pad2(n) {
  return String(Math.floor(n)).padStart(2, "0");
}

function splitTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { days, hours, minutes, seconds };
}

function circleUnit(label, valueId, ringId) {
  return `
    <div class="lb-circleUnit">
      <div class="lb-ring">
        <svg class="lb-ringSvg" viewBox="0 0 120 120" aria-hidden="true">
          <circle class="lb-ringTrack" cx="60" cy="60" r="48"></circle>
          <circle class="lb-ringProg" id="${ringId}" cx="60" cy="60" r="48"></circle>
        </svg>

        <div class="lb-ringCenter">
          <div class="lb-ringNum" id="${valueId}">--</div>
          <div class="lb-ringLbl">${label}</div>
        </div>
      </div>
    </div>
  `;
}

function setRing(circleEl, fraction) {
  if (!circleEl) return;
  const r = 48;
  const c = 2 * Math.PI * r;
  const f = clamp(fraction, 0, 1);
  circleEl.style.strokeDasharray = `${c}`;
  circleEl.style.strokeDashoffset = `${c * (1 - f)}`;
}

// -------------------- page --------------------
export function historyPage() {
  // Kill any previous timer if user re-enters page
  if (window.__ethosLeaderboardTimer) {
    clearInterval(window.__ethosLeaderboardTimer);
    window.__ethosLeaderboardTimer = null;
  }

  const root = document.getElementById("app");

  root.innerHTML = Shell({
    title: "History",
    activeTab: "History",
    content: `
      <section class="lb-page">
        <div class="card lb-card">
          <div class="lb-wrap">
            <div class="lb-title">
              Reflections <span class="lb-soon">coming soon</span>
            </div>

            <div class="lb-sub muted">
              We’re building this the calm way — clean, fair, and actually useful.
            </div>

            <div class="lb-hero">
              <img class="lb-img" src="${HERO_IMAGE_SRC}" alt="Leaderboard under construction" />
            </div>

            <div class="lb-circles" aria-label="Countdown">
              ${circleUnit("Days", "lbDays", "lbRingDays")}
              ${circleUnit("Hours", "lbHours", "lbRingHours")}
              ${circleUnit("Minutes", "lbMins", "lbRingMins")}
              ${circleUnit("Seconds", "lbSecs", "lbRingSecs")}
            </div>

            <div class="lb-progress">
              <div class="lb-progressTop">
                <div class="lb-progressLabel">Build progress</div>
                <div class="lb-progressPct" id="lbPct">0%</div>
              </div>

              <div class="lb-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100">
                <div class="lb-barFill" id="lbBarFill" style="width:0%"></div>
              </div>

              <div class="lb-meta muted" id="lbMeta"></div>
            </div>
          </div>
        </div>
      </section>
    `,
  });

  const elDays = document.getElementById("lbDays");
  const elHours = document.getElementById("lbHours");
  const elMins = document.getElementById("lbMins");
  const elSecs = document.getElementById("lbSecs");

  const ringDays = document.getElementById("lbRingDays");
  const ringHours = document.getElementById("lbRingHours");
  const ringMins = document.getElementById("lbRingMins");
  const ringSecs = document.getElementById("lbRingSecs");

  const elPct = document.getElementById("lbPct");
  const elBarFill = document.getElementById("lbBarFill");
  const elMeta = document.getElementById("lbMeta");

  const startAt = new Date(START_AT_ISO).getTime();
  const launchAt = new Date(LAUNCH_AT_ISO).getTime();

  function tick() {
    const now = Date.now();
    const remaining = launchAt - now;

    const { days, hours, minutes, seconds } = splitTime(remaining);

    // numbers
    elDays.textContent = String(days);
    elHours.textContent = pad2(hours);
    elMins.textContent = pad2(minutes);
    elSecs.textContent = pad2(seconds);

    // rings (match reference vibe)
    setRing(ringHours, hours / 24);
    setRing(ringMins, minutes / 60);
    setRing(ringSecs, seconds / 60);

    // days ring: show proportion of time left within a 30-day window feel (looks nice visually)
    const daySpan = Math.max(1, Math.min(30, days + 1));
    setRing(ringDays, 1 - days / daySpan);

    // progress bar % (start -> launch)
    const totalWindow = Math.max(1, launchAt - startAt);
    const elapsed = now - startAt;
    const pct = clamp((elapsed / totalWindow) * 100, 0, 100);

    elPct.textContent = `${Math.round(pct)}%`;
    elBarFill.style.width = `${pct}%`;

    const launchPretty = new Date(launchAt).toLocaleString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    if (remaining <= 0) {
      elMeta.textContent = `Should be live now. If it isn’t, it’s probably a deployment thing.`;
      elDays.textContent = "0";
      elHours.textContent = "00";
      elMins.textContent = "00";
      elSecs.textContent = "00";
      elPct.textContent = "100%";
      elBarFill.style.width = "100%";
      setRing(ringDays, 1);
      setRing(ringHours, 1);
      setRing(ringMins, 1);
      setRing(ringSecs, 1);
      return;
    }

    elMeta.textContent = `Expected launch: ${launchPretty}`;
  }

  tick();
  window.__ethosLeaderboardTimer = setInterval(tick, 1000);
}
