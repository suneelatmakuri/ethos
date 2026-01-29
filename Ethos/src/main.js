// src/main.js
import "./styles/base.css";

import { welcomePage } from "./pages/welcome.js";

import { observeAuth } from "./lib/auth.js";
import { getUserProfile, normalizeUserProfile } from "./lib/db.js";
import { applyThemeFromProfile } from "./lib/theme.js";

import { getRoute, navigate, startRouter } from "./router.js";

// Public pages
import { authLandingPage } from "./pages/authLanding.js";
import { authEmailPage } from "./pages/authEmail.js";
import { authPasswordPage } from "./pages/authPassword.js";
import { authCreatePasswordPage } from "./pages/authCreatePassword.js";

// Protected pages
import { profileSetupPage } from "./pages/profileSetup.js";
import { homePage } from "./pages/home.js";
import { todayPage } from "./pages/today.js";
import { todayLogPage } from "./pages/todayLog.js";
import { historyPage } from "./pages/history.js";
import { settingsPage } from "./pages/settings.js";
import { leaderboardPage } from "./pages/leaderboard.js";

// Settings sub-pages
import { settingsProfilePage } from "./pages/settingsProfile.js";
import { settingsTracksPage } from "./pages/settingsTracks.js";
import { settingsTrackEditPage } from "./pages/settingsTrackEdit.js";
import { settingsThemePage } from "./pages/settingsTheme.js";
import { settingsTrackTemplatesPage } from "./pages/settingsTrackTemplates.js";

let currentUser = null;
let currentProfile = null;
let profileLoadedForUid = null;

// prevents the “flash to auth” on refresh
let authResolved = false;

// normalization guard (avoid infinite loops)
let normalizedForUid = null;

function isPublicRoute(path) {
  return path === "#/welcome" || path.startsWith("#/auth");
}

function isProtectedRoute(path) {
  return [
    "#/profile-setup",
    "#/home",
    "#/today",
    "#/today/log",
    "#/history",
    "#/settings",
    "#/leaderboard",
    "#/settings/profile",
    "#/settings/theme",
    "#/settings/tracks",
    "#/settings/tracks/edit",
    "#/settings/tracks/new",
    "#/settings/tracks/templates",
  ].includes(path.split("?")[0]);
}

async function ensureProfileLoaded() {
  if (!currentUser) {
    currentProfile = null;
    profileLoadedForUid = null;
    return;
  }
  if (profileLoadedForUid === currentUser.uid) return;

  profileLoadedForUid = currentUser.uid;
  currentProfile = await getUserProfile(currentUser.uid);
}

function getRenderer(path) {
  const base = path.split("?")[0];

  switch (base) {
    // Public
    case "#/welcome":
      return welcomePage;
    case "#/auth":
      return authLandingPage;
    case "#/auth/email":
      return authEmailPage;
    case "#/auth/password":
      return authPasswordPage;
    case "#/auth/create-password":
      return authCreatePasswordPage;

    // Protected
    case "#/profile-setup":
      return () => profileSetupPage({ user: currentUser });

    case "#/home":
      return () => homePage({ user: currentUser, profile: currentProfile });

    case "#/today":
      return () => todayPage({ user: currentUser, profile: currentProfile });

    case "#/today/log":
      return () => todayLogPage({ user: currentUser, profile: currentProfile });

    case "#/history":
      return historyPage;

    case "#/leaderboard":
      return leaderboardPage;

    case "#/settings":
      return () => settingsPage({ user: currentUser, profile: currentProfile });

    case "#/settings/profile":
      return () => settingsProfilePage({ user: currentUser, profile: currentProfile });

    case "#/settings/theme":
      return () => settingsThemePage({ user: currentUser, profile: currentProfile });

    case "#/settings/tracks":
      return () => settingsTracksPage({ user: currentUser, profile: currentProfile });

    case "#/settings/tracks/edit":
      return () => settingsTrackEditPage({ user: currentUser, mode: "edit" });

    case "#/settings/tracks/new":
      return () => settingsTrackEditPage({ user: currentUser, mode: "new" });

    case "#/settings/tracks/templates":
      // IMPORTANT: ensure it actually renders
      return () => settingsTrackTemplatesPage();

    default:
      return null;
  }
}

function renderFatal(error) {
  console.error("App render fatal:", error);
  const root = document.getElementById("app");
  root.innerHTML = `
    <div class="center">
      <div class="card">
        <div class="card-title">Something broke</div>
        <p class="muted" style="white-space:pre-wrap;">${error?.message || String(error)}</p>
        <button class="btn" onclick="location.reload()">Reload</button>
      </div>
    </div>
  `;
}

async function renderApp() {
  try {
    // Wait until Firebase resolves auth at least once (prevents refresh flicker)
    if (!authResolved) {
      document.getElementById("app").innerHTML =
        `<div class="center"><p class="muted">Loading…</p></div>`;
      return;
    }

    const { path } = getRoute();

    // Default route if hash is empty
    if (!path) {
      navigate("#/welcome");
      return;
    }

    // Not signed in → allow only auth routes
    if (!currentUser) {
      // Public background applies to welcome + auth pages
      document.body.classList.add("public-bg");

      if (!isPublicRoute(path)) navigate("#/welcome");

      const { path: finalPath } = getRoute();
      const fn = getRenderer(finalPath) || welcomePage;
      fn();
      return;
    }


    // Signed in → load profile
    await ensureProfileLoaded();

    // Profile missing → force profile setup (block everything else)
    if (!currentProfile && path !== "#/profile-setup") {
      navigate("#/profile-setup");
      profileSetupPage({ user: currentUser });
      return;
    }

    // Normalize once per session (optional)
    if (currentUser && currentProfile && normalizedForUid !== currentUser.uid) {
      try {
        const didWrite = await normalizeUserProfile(
          currentUser.uid,
          currentUser.email,
          currentProfile
        );

        normalizedForUid = currentUser.uid;

        if (didWrite) {
          currentProfile = await getUserProfile(currentUser.uid);
        }
      } catch (e) {
        console.error("Profile normalization failed:", e);
        normalizedForUid = currentUser.uid;
      }
    }

    // Apply theme (never allow this to blank the app)
    try {
      applyThemeFromProfile(currentProfile);
    } catch (e) {
      console.warn("Theme apply failed (continuing):", e);
    }

    // Profile exists but user visits auth routes → send home
    if (currentProfile && isPublicRoute(path)) {
      navigate("#/home");
      homePage();
      return;
    }

    // Render protected routes
    if (isProtectedRoute(path)) {
      const fn = getRenderer(path) || homePage;
      fn();
      return;
    }

    // Fallback
    navigate("#/home");
    homePage();
  } catch (e) {
    renderFatal(e);
  }
}

// Start router (hashchange)
startRouter(renderApp);

// Auth observer is the “true” bootstrap
observeAuth(async (user) => {
  currentUser = user || null;
    if (currentUser) {
      document.body.classList.remove("public-bg");
      document.body.style.removeProperty("--publicBgUrl");
    }

  authResolved = true;

  // Reset profile cache when auth changes
  if (!currentUser) {
    currentProfile = null;
    profileLoadedForUid = null;
    normalizedForUid = null;
  } else if (profileLoadedForUid !== currentUser.uid) {
    currentProfile = null;
    normalizedForUid = null;
  }

  await renderApp();
});

// First paint while waiting for auth resolution
document.getElementById("app").innerHTML =
  `<div class="center"><p class="muted">Loading…</p></div>`;
