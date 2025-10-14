// ==========================
// 🔹 Papadums POS Firebase Client (Realtime Sync)
// 🔹 Project: invoiceapp-8026d
// ==========================

import { db } from "./firebase_config.js"; // correct relative path
import {
  doc,
  setDoc,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// === Save order to Firestore per table ===
export async function saveOrderToFirestore(tableId, data) {
  try {
    const ref = doc(db, "tables", tableId);
    await setDoc(ref, { ...data, lastModified: serverTimestamp() }, { merge: true });
    console.log(`✅ Saved to Firestore: ${tableId}`);
  } catch (err) {
    console.error("❌ Error saving to Firestore:", err);
    throw err;
  }
}

// === Subscribe to real-time Firestore updates ===
export function subscribeToTable(tableId, callback) {
  const ref = doc(db, "tables", tableId);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) callback(snap.data());
    },
    (error) => {
      console.error("⚠️ Firestore listener error:", error);
    }
  );
}

// === Auth state dummy handler ===
export async function authState() {
  console.log("🔐 Firebase client ready (no auth needed)");
  return Promise.resolve(true);
}
