// src/main.js
import "./styles/base.css";

import { observeAuth } from "./lib/auth.js";
import { getUserProfile } from "./lib/db.js";

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
import { historyPage } from "./pages/history.js";
import { settingsPage } from "./pages/settings.js";
import { leaderboardPage } from "./pages/leaderboard.js";

let currentUser = null;
let currentProfile = null;
let profileLoadedForUid = null;

// prevents the “flash to auth” on refresh
let authResolved = false;

function isPublicRoute(path) {
  return path.startsWith("#/auth");
}

function isProtectedRoute(path) {
  return [
    "#/profile-setup",
    "#/home",
    "#/today",
    "#/history",
    "#/settings",
    "#/leaderboard",
  ].includes(path);
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
  switch (path) {
    // Public
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
      return homePage;
    case "#/today":
      return todayPage;
    case "#/history":
      return historyPage;
    case "#/leaderboard":
      return leaderboardPage;
    case "#/settings":
      return settingsPage;

    default:
      return null;
  }
}

async function renderApp() {
  // Wait until Firebase resolves auth at least once (prevents refresh flicker)
  if (!authResolved) {
    document.getElementById("app").innerHTML =
      `<div class="center"><p class="muted">Loading…</p></div>`;
    return;
  }

  const { path } = getRoute();

  // Default route if hash is empty
  if (!path) {
    navigate("#/auth");
    return;
  }

  // Not signed in → allow only auth routes
  if (!currentUser) {
    if (!isPublicRoute(path)) navigate("#/auth");
    const { path: finalPath } = getRoute();
    const fn = getRenderer(finalPath) || authLandingPage;
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
}

// Start router (hashchange)
startRouter(renderApp);

// Auth observer is the “true” bootstrap
observeAuth(async (user) => {
  currentUser = user || null;
  authResolved = true;

  // Reset profile cache when auth changes
  if (!currentUser) {
    currentProfile = null;
    profileLoadedForUid = null;
  } else if (profileLoadedForUid !== currentUser.uid) {
    currentProfile = null;
  }

  await renderApp();
});

// First paint while waiting for auth resolution
document.getElementById("app").innerHTML =
  `<div class="center"><p class="muted">Loading…</p></div>`;
