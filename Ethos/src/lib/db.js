// src/lib/db.js
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  deleteDoc,
  limit,
} from "firebase/firestore";

/* -----------------------------
   Profile
----------------------------- */

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Create/merge a user profile.
 * IMPORTANT: we always write the locked fields (uid/email/role/weekStartsOn) once,
 * so future rule checks are stable.
 */
export async function createUserProfile(uid, data) {
  const ref = doc(db, "users", uid);

  const payload = {
    uid,
    email: data?.email ?? null,
    role: data?.role ?? "user",
    weekStartsOn: "monday",

    // editable fields
    displayName: data?.displayName ?? "",
    dob: data?.dob ?? null,
    timeZone: data?.timeZone ?? data?.preferences?.timeZone ?? "Asia/Kolkata",

    // preferences are theme-related (timezone should be top-level)
    preferences: {
      ...(data?.preferences || {}),
    },

    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload, { merge: true });
  return payload;
}

/**
 * Safe patch update for editable fields.
 */
export async function updateUserProfile(uid, patch) {
  const ref = doc(db, "users", uid);
  await updateDoc(ref, {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Temporary normalizer to fix legacy/incomplete user docs.
 *
 * Fixes:
 * - adds missing uid
 * - adds missing role (defaults to "user")
 * - ensures weekStartsOn = "monday"
 * - ensures email is present (if we know it)
 * - migrates preferences.timeZone -> top-level timeZone (if top-level missing)
 *
 * Safe to run repeatedly: merge-only.
 *
 * Returns true if it wrote anything, false otherwise.
 */
export async function normalizeUserProfile(uid, userEmail, currentProfile) {
  const patch = {};
  let changed = false;

  // Locked fields: add if missing
  if (!currentProfile?.uid) {
    patch.uid = uid;
    changed = true;
  }
  if (!currentProfile?.role) {
    patch.role = "user";
    changed = true;
  }
  if (!currentProfile?.weekStartsOn) {
    patch.weekStartsOn = "monday";
    changed = true;
  }

  // Email: add if missing + we know it
  if (!currentProfile?.email && userEmail) {
    patch.email = userEmail;
    changed = true;
  }

  // Time zone migration:
  // If top-level timeZone is missing but preferences.timeZone exists, copy it up.
  const prefTz = currentProfile?.preferences?.timeZone;
  if (!currentProfile?.timeZone && prefTz) {
    patch.timeZone = prefTz;
    changed = true;
  }

  // If both missing, set a default
  if (!currentProfile?.timeZone && !prefTz) {
    patch.timeZone = "Asia/Kolkata";
    changed = true;
  }

  if (!changed) return false;

  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    {
      ...patch,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return true;
}

/* -----------------------------
   Tracks (basic helpers)
   (kept here because your Settings/Today pages likely rely on these)
----------------------------- */

export async function readActiveTracks(uid) {
    const ref = collection(db, "users", uid, "tracks");
    const q = query(ref, where("isActive", "==", true), orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
  
    // IMPORTANT: spread first, then force id last so it can't be overwritten
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function readAllTracks(uid) {
    const ref = collection(db, "users", uid, "tracks");
    const q = query(ref, orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
  
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
}

export async function createTrack(uid, track) {
  const tracksRef = collection(db, "users", uid, "tracks");
  const ref = doc(tracksRef); // auto-id

  const payload = {
    ...track,
    isActive: track?.isActive ?? true,
    sortOrder: track?.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, payload);
  return ref.id;
}

export async function updateTrack(uid, trackId, patch) {
  const ref = doc(db, "users", uid, "tracks", trackId);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

export async function deleteTrack(uid, trackId) {
  const ref = doc(db, "users", uid, "tracks", trackId);
  await deleteDoc(ref);
}


// Read day aggregates doc
export async function getDayDoc(uid, dayKey) {
    const ref = doc(db, "users", uid, "days", dayKey);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
}
  
// Read last N day docs (for weekly/monthly rollups without extra indexes)

export async function getLastDays(uid, n) {
    const ref = collection(db, "users", uid, "days");
    const q = query(ref, orderBy("dayKey", "desc"), limit(n));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data());
}

export async function getEntriesForTrackOnDay(uid, dayKey, trackId, max = 50) {
    const ref = collection(db, "users", uid, "days", dayKey, "entries");
    const q = query(
      ref,
      where("trackId", "==", trackId),
      orderBy("createdAtMs", "desc"),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  