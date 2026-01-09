// src/lib/db.js
import { db } from "./firebase.js";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

export async function getUserProfile(uid) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
  const ref = doc(db, "users", uid);
  const payload = {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });
  return payload;
}
