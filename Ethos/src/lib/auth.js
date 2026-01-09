// src/lib/auth.js
import {
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithPopup,
    fetchSignInMethodsForEmail,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    signOut as firebaseSignOut,
  } from "firebase/auth";
  
  import { auth } from "./firebase.js";
  
  export function observeAuth(cb) {
    return onAuthStateChanged(auth, cb);
  }
  
  export async function signInWithGoogle(keepSignedIn = true) {
    await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }  
  
  export async function getEmailMethods(email) {
    const cleaned = String(email || "").trim().toLowerCase();
    if (!cleaned) return [];
    return fetchSignInMethodsForEmail(auth, cleaned);
  }
  
  export async function signInWithEmailPassword(email, password, keepSignedIn = true) {
    await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
    return signInWithEmailAndPassword(auth, email, password);
  }
  
  export async function createEmailPasswordUser(email, password, keepSignedIn = true) {
    await setPersistence(auth, keepSignedIn ? browserLocalPersistence : browserSessionPersistence);
    return createUserWithEmailAndPassword(auth, email, password);
  }
  
  export async function sendPasswordReset(email) {
    return sendPasswordResetEmail(auth, email);
  }
  
  export async function signOut() {
    return firebaseSignOut(auth);
  }
  