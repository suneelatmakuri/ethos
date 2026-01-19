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
  
  // ---------- Profile updates ----------
  export async function updateProfile(uid, patch) {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
  }
  
  // ---------- Track CRUD ----------
  export async function createTrack(uid, track) {
    const ref = doc(collection(db, "users", uid, "tracks"));
    await setDoc(ref, {
      ...track,
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
        [`${prefix}.count`]: !!value ? 1 : 0,
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function addBooleanCount(uid, dayKey, timeZone, trackId, deltaCount = 1) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "BOOLEAN",
      deltaCount,
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "BOOLEAN",
        [`${prefix}.count`]: increment(deltaCount),
        [`${prefix}.done`]: true,
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function replaceNumber(uid, dayKey, timeZone, trackId, value) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "NUMBER_REPLACE",
      value,
      createdAt: serverTimestamp(),
    });
  
    const dRef = dayRef(uid, dayKey);
    batch.set(dRef, baseDayUpsert(dayKey, timeZone), { merge: true });
  
    const prefix = `tracks.${trackId}`;
    batch.set(
      dRef,
      {
        [`${prefix}.type`]: "NUMBER_REPLACE",
        [`${prefix}.value`]: value,
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function appendText(uid, dayKey, timeZone, trackId, text) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "TEXT_APPEND",
      text,
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
        [`${prefix}.preview`]: String(text).slice(0, 80),
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  
  export async function addDropdown(uid, dayKey, timeZone, trackId, optionId) {
    const batch = writeBatch(db);
    const entryRef = doc(entriesCol(uid, dayKey));
    batch.set(entryRef, {
      trackId,
      type: "DROPDOWN_EVENT",
      optionIds: [optionId],
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
        [`${prefix}.lastValue`]: [optionId],
        [`${prefix}.lastAt`]: serverTimestamp(),
      },
      { merge: true }
    );
  
    await batch.commit();
  }
  