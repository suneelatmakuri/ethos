import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDJurXmliChoLZ5tdiXsH-kTaiyfcEtsgM",
    authDomain: "ethos-dev-ec0d6.firebaseapp.com",
    projectId: "ethos-dev-ec0d6",
    storageBucket: "ethos-dev-ec0d6.firebasestorage.app",
    messagingSenderId: "154735949292",
    appId: "1:154735949292:web:2641d40b6563c39f9efcc9"
  };

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
