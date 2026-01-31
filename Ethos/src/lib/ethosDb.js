// src/lib/ethosDb.js
import {
    collection,
    doc,
    getDoc,
    getDocs,
    limit,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch,
    increment,
    deleteDoc,
  } from "firebase/firestore";
  
  import { db } from "./firebase.js";
  import { isoWeekKeyFromDayKey, monthKeyFromDayKey } from "./dayKeys.js";
  import { ETHOS_CONFIG } from "../config/ethosConfig.js";
  
  // ---------- Reads ----------
  export async function readProfile(uid) {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }

  export async function readAllTracks(uid) {
    const ref = collection(db, "users", uid, "tracks");
    const q = query(ref, orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ ...d.data(), id: d.id }));
  }
  
  
  export async function readActiveTracks(uid) {
    const ref = collection(db, "users", uid, "tracks");
    const q = query(ref, where("isActive", "==", true), orderBy("sortOrder", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  export async function readDayDoc(uid, dayKey) {
    const ref = doc(db, "users", uid, "days", dayKey);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  }
  
  export async function readEntriesForDayTrack(uid, dayKey, trackId, pageSize = 200) {
    const ref = collection(db, "users", uid, "days", dayKey, "entries");
    const q = query(
      ref,
      where("trackId", "==", trackId),
      orderBy("createdAt", "desc"),
      limit(pageSize)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  
  // ---------- Track CRUD ----------
  export async function createTrack(uid, track) {
    const ref = doc(collection(db, "users", uid, "tracks"));
    await setDoc(ref, {
      ...track,
      // Optional metadata (safe to ignore everywhere else)
      meta: {
        ...(track.meta ?? {}),
        createdBy: track.meta?.createdBy ?? uid,
      },
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

  // ---------- Global Track Templates (top-level collection) ----------
  /**
   * Deterministic key used to de-dupe templates.
   * Keep this stable: changing it later will create duplicates.
   */
  export function computeNormalizedKey(trackLike) {
    const norm = (v) =>
      String(v ?? "")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");

    // IMPORTANT: We intentionally exclude fields that shouldn't affect template identity.
    // We include cadence here only to reduce accidental collisions for now.
    // Leaderboard identity will still be based on templateId (not cadence).
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
    const ref = collection(db, "trackTemplates");
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  /**
   * Create a template if it doesn't already exist, otherwise reuse the existing one.
   * Returns: templateId (string)
   */
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

    if (!snap.empty) {
      return snap.docs[0].id;
    }

    const ref = doc(collection(db, "trackTemplates"));

    await setDoc(ref, {
      name: track.name ?? "",
      displayLabel: track.displayLabel ?? track.name ?? "",
      type: track.type ?? "",
      cadence: track.cadence ?? "daily",
      unit: track.unit ?? "",
      target: track.target ?? null,
      config: track.config ?? {},
      category: category ?? null,
      createdBy: createdBy ?? null,
      createdByName: createdByName ?? null,
      normalizedKey,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return ref.id;
  }
  
  // ---------- Seed defaults ----------
  export async function seedDefaultTracksIfEmpty(uid) {
    const ref = collection(db, "users", uid, "tracks");
    const q = query(ref, limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) return { didSeed: false };
  
    const batch = writeBatch(db);
    const now = serverTimestamp();
    ETHOS_CONFIG.defaultTracks.forEach((t, i) => {
      const tRef = doc(ref);
      batch.set(tRef, {
        ...t,
        isActive: true,
        sortOrder: (i + 1) * 10,
        createdAt: now,
        updatedAt: now,
      });
    });
    await batch.commit();
    return { didSeed: true };
  }
  
  // ---------- Writes (batch entry + day aggregates) ----------
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
  
  export async function addCounter(uid, dayKey, timeZone, trackId, deltaValue, note = null) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "COUNTER_INCREMENT",
      deltaValue,
      note,
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "COUNTER_INCREMENT",
        [`${prefix}.count`]: increment(1),
        [`${prefix}.sum`]: increment(deltaValue),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function setBoolean(uid, dayKey, timeZone, trackId, value) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "BOOLEAN",
      value: !!value,
      createdAt: serverTimestamp(),
    });
  
    
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "BOOLEAN",
        [`${prefix}.done`]: !!value,
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function addBooleanCount(uid, dayKey, timeZone, trackId, delta = 1) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "BOOLEAN",
      deltaValue: delta,
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "BOOLEAN",
        [`${prefix}.count`]: increment(1),
        [`${prefix}.sum`]: increment(delta),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function setNumberReplace(uid, dayKey, timeZone, trackId, value) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "NUMBER_REPLACE",
      value: Number(value),
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "NUMBER_REPLACE",
        [`${prefix}.value`]: Number(value),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function addTextAppend(uid, dayKey, timeZone, trackId, text) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "TEXT_APPEND",
      text: String(text ?? ""),
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "TEXT_APPEND",
        [`${prefix}.count`]: increment(1),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function addDropdownEvent(uid, dayKey, timeZone, trackId, optionId) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "DROPDOWN_EVENT",
      optionId: String(optionId ?? ""),
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "DROPDOWN_EVENT",
        [`${prefix}.count`]: increment(1),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
