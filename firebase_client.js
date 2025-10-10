// firebase_client.js
// Modular Firebase helper: anonymous auth + Firestore realtime + offline persistence

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  enableIndexedDbPersistence
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

/* ---------- CONFIG: paste your Firebase config here (or use the one you already have) ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDRc3dNn-OIidR2Qv6o9wvlpJ3Yx5vJzI4",
  authDomain: "invoiceapp-8026d.firebaseapp.com",
  projectId: "invoiceapp-8026d",
  storageBucket: "invoiceapp-8026d.appspot.com",
  messagingSenderId: "871292464773",
  appId: "1:871292464773:web:abf324b83a14f21ce2cd2f",
  measurementId: "G-4QMSJQKX8R"
};
/* ---------------------------------------------------------------------------------------------- */

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Try offline persistence
enableIndexedDbPersistence(db).catch((err) => {
  // common reasons: multiple tabs, browser not supported
  console.warn("IndexedDB persistence not enabled:", err && err.code);
});

// auto anonymous sign-in
signInAnonymously(auth).catch(err => console.warn("Anonymous sign-in failed:", err));

/** Wait until an auth state exists (resolve user or null) */
export function authState() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    }, err => reject(err));
  });
}

/**
 * Save order to Firestore under collection 'orders' with docId = tableId
 * payload: { table, items }
 */
export async function saveOrderToFirestore(tableId, payload) {
  const ref = doc(db, "orders", tableId);
  const u = auth.currentUser;
  const docData = {
    table: payload.table || tableId,
    items: payload.items || [],
    modifiedBy: u ? u.uid : null,
    lastModified: serverTimestamp()
  };
  return setDoc(ref, docData, { merge: true });
}

/**
 * Subscribe to realtime updates for a table doc.
 * onUpdate receives null (no doc) or the doc data.
 * Returns unsubscribe function.
 */
export function subscribeToTable(tableId, onUpdate) {
  const ref = doc(db, "orders", tableId);
  const unsub = onSnapshot(ref, snap => {
    onUpdate(snap.exists() ? snap.data() : null);
  }, err => {
    console.error("Firestore onSnapshot error:", err);
  });
  return unsub;
}