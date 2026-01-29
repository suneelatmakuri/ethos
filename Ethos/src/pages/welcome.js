import { navigate } from "../router.js";

/**
 * ============================
 * ONLY EDIT THESE (timings)
 * ============================
 * Times are in milliseconds from page load.
 */
const SHOW_TITLE_AT_MS = 4000;     // Ethos appears
const SHOW_SUBTITLE_AT_MS = 6000;  // a way of being appears
const SHOW_LOGIN_AT_MS = 7000;     // login button appears

/**
 * Title size knob (1 = normal).
 * Example: 1.15 for slightly larger.
 */
const TITLE_SCALE = 1.0;

/**
 * Video path (public/assets)
 */
const VIDEO_SRC = `${import.meta.env.BASE_URL}assets/welcome-ambient.mp4`;

function freezeOnLastFrame(videoEl) {
  // Pause and pin at the end to stop GPU work.
  const snapToEnd = () => {
    try {
      const end = Math.max(0, (videoEl.duration || 0) - 0.04); // ~last frame
      videoEl.currentTime = end;
      videoEl.pause();
    } catch {
      // ignore
    }
  };

  videoEl.addEventListener("ended", snapToEnd);
  videoEl.addEventListener("pause", () => {
    // If it pauses early for any reason, don't fight it.
  });

  // Fallback: if ended doesn't fire (rare), watch time
  videoEl.addEventListener("timeupdate", () => {
    if (!videoEl.duration) return;
    if (videoEl.currentTime >= videoEl.duration - 0.08) snapToEnd();
  });
}

export function welcomePage() {
  // Apply page mode (so CSS can target body cleanly)
  document.body.classList.add("welcome-mode");
  document.body.style.setProperty("--welcomeTitleScale", String(TITLE_SCALE));

  const root = document.getElementById("app");

  root.innerHTML = `
    <div class="welcomeStage">
      <video
        class="welcomeVideo"
        id="welcomeVideo"
        autoplay
        muted
        playsinline
        preload="auto"
      >
        <source src="${VIDEO_SRC}" type="video/mp4" />
      </video>

      <div class="welcomeOverlay">
        <div class="welcomeTitle" id="welcomeTitle">Ethos</div>
        <div class="welcomeSubtitle" id="welcomeSubtitle">a way of being</div>

        <button class="welcomeLogin" id="welcomeLogin" type="button">
          Login
        </button>
      </div>
    </div>
  `;

  const video = document.getElementById("welcomeVideo");
  const title = document.getElementById("welcomeTitle");
  const sub = document.getElementById("welcomeSubtitle");
  const btn = document.getElementById("welcomeLogin");

  // Start hidden (in case CSS didn’t apply yet)
  title.classList.remove("is-in");
  sub.classList.remove("is-in");
  btn.classList.remove("is-in");

  // Video behavior: play once, then freeze on last frame
  // (autoplay requires muted+playsinline, which we set)
  freezeOnLastFrame(video);

  // Some browsers block autoplay on first load; try once more on user gesture
  video.play?.().catch(() => {});

  // Timed reveals
  const t1 = setTimeout(() => title.classList.add("is-in"), SHOW_TITLE_AT_MS);
  const t2 = setTimeout(() => sub.classList.add("is-in"), SHOW_SUBTITLE_AT_MS);
  const t3 = setTimeout(() => btn.classList.add("is-in"), SHOW_LOGIN_AT_MS);

  btn.onclick = () => navigate("#/auth");

  // Cleanup timer if user navigates away quickly
  if (window.__ethosWelcomeTimers) {
    window.__ethosWelcomeTimers.forEach(clearTimeout);
  }
  window.__ethosWelcomeTimers = [t1, t2, t3];
}
