// src/lib/db.js
import { db } from "./firebase.js";
import {
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
  increment,
} from "firebase/firestore";

import { isoWeekKeyFromDayKey, monthKeyFromDayKey } from "./dayKeys.js";

/* =====================================================
   PROFILE
===================================================== */

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// --- PROFILES (minimal public-ish docs) ---
// /profiles/{uid} : { displayName, updatedAt }

export async function getProfile(uid) {
  const ref = doc(db, "profiles", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

// small app => simple per-uid reads are fine
export async function getProfilesMap(uids) {
  const map = {};
  const unique = Array.from(new Set((uids || []).filter(Boolean)));
  await Promise.all(
    unique.map(async (uid) => {
      try {
        const p = await getProfile(uid);
        if (p?.displayName) map[uid] = p.displayName;
      } catch {
        // ignore
      }
    })
  );
  return map;
}


export async function createUserProfile(uid, profile) {
  const ref = doc(db, "users", uid);

  await setDoc(ref, {
    ...profile,
    friends: Array.isArray(profile?.friends) ? profile.friends : [], // safe default
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Mirror minimal public info for friend-readable UI
  const pRef = doc(db, "profiles", uid);
  await setDoc(
    pRef,
    {
      displayName: profile?.displayName || "",
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}


export async function updateUserProfile(uid, patch) {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) {
    throw new Error(`updateUserProfile() patch must be an object. Got: ${typeof patch}`);
  }

  const ref = doc(db, "users", uid);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });

  // If displayName changes, keep profiles in sync
  if ("displayName" in patch) {
    const pRef = doc(db, "profiles", uid);
    await setDoc(
      pRef,
      {
        displayName: patch.displayName || "",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

export async function ensureProfileMirror(uid, displayName) {
  if (!uid) return false;

  const pRef = doc(db, "profiles", uid);

  // If profile doc exists, optionally update name if provided
  const snap = await getDoc(pRef);

  if (!snap.exists()) {
    await setDoc(pRef, {
      displayName: displayName || "",
      updatedAt: serverTimestamp(),
    });
    return true;
  }

  // Keep name synced if you pass displayName
  if (typeof displayName === "string" && displayName.trim()) {
    const curr = snap.data();
    if ((curr.displayName || "") !== displayName) {
      await setDoc(
        pRef,
        { displayName, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return true;
    }
  }

  return false;
}


export async function normalizeUserProfile(uid, email, currentProfile) {
  if (!uid || !currentProfile) return false;

  const patch = {};
  let didWrite = false;

  if (!currentProfile.uid || currentProfile.uid !== uid) {
    patch.uid = uid;
    didWrite = true;
  }

  if (email && (!currentProfile.email || currentProfile.email !== email)) {
    patch.email = email;
    didWrite = true;
  }

  if (!("friends" in currentProfile)) {
    patch.friends = [];
    didWrite = true;
  }

  if (didWrite) {
    await updateUserProfile(uid, patch);
  }

  // ✅ Always ensure /profiles mirror exists for existing users
  await ensureProfileMirror(uid, currentProfile?.displayName || "");

  return didWrite;
}



/* =====================================================
   TRACKS (USER)
===================================================== */

export async function readAllTracks(uid) {
  const ref = collection(db, "users", uid, "tracks");
  const q = query(ref, orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function readActiveTracks(uid) {
  const ref = collection(db, "users", uid, "tracks");
  const q = query(ref, where("isActive", "==", true), orderBy("sortOrder", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function createTrack(uid, track) {
  const ref = doc(collection(db, "users", uid, "tracks"));

  const meta = {
    ...(track.meta ?? {}),
    createdBy: track.meta?.createdBy ?? uid,
  };

  await setDoc(ref, {
    ...track,
    meta,
    isActive: track.isActive ?? true,
    sortOrder: track.sortOrder ?? Date.now(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

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

/* =====================================================
   DAYS & ENTRIES (READS)
===================================================== */

export async function getDayDoc(uid, dayKey) {
  const ref = doc(db, "users", uid, "days", dayKey);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function getLastDays(uid, count = 14) {
  const ref = collection(db, "users", uid, "days");
  const q = query(ref, orderBy("dayKey", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getEntriesForTrackOnDay(uid, dayKey, trackId, count = 200) {
  const ref = collection(db, "users", uid, "days", dayKey, "entries");
  const q = query(ref, where("trackId", "==", trackId), orderBy("createdAt", "desc"), limit(count));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/* =====================================================
   INTERNAL HELPERS
===================================================== */

function dayRef(uid, dayKey) {
  return doc(db, "users", uid, "days", dayKey);
}

function entriesCol(uid, dayKey) {
  return collection(db, "users", uid, "days", dayKey, "entries");
}

function baseDayUpsert(dayKey, timeZone) {
  return {
    dayKey,
    timeZone,
    period: {
      weekKey: isoWeekKeyFromDayKey(dayKey),
      monthKey: monthKeyFromDayKey(dayKey),
    },
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
}

/* =====================================================
   ENTRY WRITES + DAY AGGREGATES
===================================================== */

export async function addCounter(uid, dayKey, timeZone, trackId, deltaValue, note = null) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "COUNTER_INCREMENT",
    deltaValue,
    note,
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "COUNTER_INCREMENT",
      [`${p}.count`]: increment(1),
      [`${p}.sum`]: increment(deltaValue),
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function setBoolean(uid, dayKey, timeZone, trackId, value) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "BOOLEAN",
    value: !!value,
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "BOOLEAN",
      [`${p}.done`]: !!value,
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function addBooleanCount(uid, dayKey, timeZone, trackId, delta = 1) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "BOOLEAN",
    deltaValue: delta,
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "BOOLEAN",
      [`${p}.count`]: increment(1),
      [`${p}.sum`]: increment(delta),
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function setNumberReplace(uid, dayKey, timeZone, trackId, value) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "NUMBER_REPLACE",
    value: Number(value),
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "NUMBER_REPLACE",
      [`${p}.value`]: Number(value),
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function addTextAppend(uid, dayKey, timeZone, trackId, text) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "TEXT_APPEND",
    text: String(text ?? ""),
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "TEXT_APPEND",
      [`${p}.count`]: increment(1),
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

export async function addDropdownEvent(uid, dayKey, timeZone, trackId, optionId) {
  const batch = writeBatch(db);

  batch.set(doc(entriesCol(uid, dayKey)), {
    trackId,
    type: "DROPDOWN_EVENT",
    optionId: String(optionId ?? ""),
    createdAt: serverTimestamp(),
  });

  const dRef = dayRef(uid, dayKey);
  batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });

  const p = `tracks.${trackId}`;
  batch.set(
    dRef,
    {
      [`${p}.type`]: "DROPDOWN_EVENT",
      [`${p}.count`]: increment(1),
      [`${p}.lastAt`]: serverTimestamp(),
    },
    { merge: true }
  );

  await batch.commit();
}

/* =====================================================
   GLOBAL TRACK TEMPLATES
===================================================== */

export function computeNormalizedKey(trackLike) {
  const norm = (v) =>
    String(v ?? "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ");

  const base = {
    name: norm(trackLike?.name),
    type: String(trackLike?.type ?? ""),
    unit: norm(trackLike?.unit),
    cadence: String(trackLike?.cadence ?? ""),
    target: trackLike?.target ?? null,
    config: trackLike?.config ?? {},
  };

  return JSON.stringify(base);
}

export async function readTrackTemplates() {
  const snap = await getDocs(collection(db, "trackTemplates"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertTrackTemplate({
  track,
  createdBy,
  createdByName = null,
  category = null,
}) {
  const normalizedKey = computeNormalizedKey(track);

  const q = query(
    collection(db, "trackTemplates"),
    where("normalizedKey", "==", normalizedKey),
    limit(1)
  );

  const snap = await getDocs(q);
  if (!snap.empty) return snap.docs[0].id;

  const ref = doc(collection(db, "trackTemplates"));

  await setDoc(ref, {
    name: track.name ?? "",
    displayLabel: track.displayLabel ?? track.name ?? "",
    type: track.type ?? "",
    cadence: track.cadence ?? "daily",
    unit: track.unit ?? "",
    target: track.target ?? null,
    config: track.config ?? {},
    category,
    createdBy,
    createdByName,
    normalizedKey,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return ref.id;
}
