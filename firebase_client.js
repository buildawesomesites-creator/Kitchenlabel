// firebase_client.js
// Modular Firebase: Auth + Firestore + Offline + Realtime support

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

/* ---------- Papadums Invoice Firebase Config ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyDRc3dNn-OIidR2Qv6o9wvlpJ3Yx5vJzI4",
  authDomain: "invoiceapp-8026d.firebaseapp.com",
  projectId: "invoiceapp-8026d",
  storageBucket: "invoiceapp-8026d.appspot.com",
  messagingSenderId: "871292464773",
  appId: "1:871292464773:web:abf324b83a14f21ce2cd2f",
  measurementId: "G-4QMSJQKX8R"
};
/* ------------------------------------------------------ */

// Initialize
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Enable local caching (for offline POS use)
enableIndexedDbPersistence(db).catch(err => {
  console.warn("⚠️ Offline persistence not enabled:", err.code);
});

// Anonymous login (no prompt)
signInAnonymously(auth).catch(err => {
  console.error("❌ Firebase Auth failed:", err.message);
});

/** Wait for Firebase auth to complete */
export function authState() {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      resolve(user);
    }, reject);
  });
}

/** Save a table’s order to Firestore */
export async function saveOrderToFirestore(tableId, payload) {
  const ref = doc(db, "orders", tableId);
  const u = auth.currentUser;
  const data = {
    table: payload.table || tableId,
    items: payload.items || [],
    modifiedBy: u ? u.uid : null,
    lastModified: serverTimestamp()
  };
  await setDoc(ref, data, { merge: true });
}

/** Subscribe to table changes (live updates) */
export function subscribeToTable(tableId, onUpdate) {
  const ref = doc(db, "orders", tableId);
  return onSnapshot(ref, snap => {
    onUpdate(snap.exists() ? snap.data() : null);
  }, err => console.error("onSnapshot error:", err));
}

export { db };
