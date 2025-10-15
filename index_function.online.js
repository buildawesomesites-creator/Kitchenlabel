// =================== Papadums POS — Firestore Sync ===================
import { db } from "./firebase_config.js";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
  getDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

console.log("✅ Firestore sync module loaded");

// --- Save cart data online ---
export async function syncToFirestore() {
  const currentTable = window.currentTable || "table1";
  const cart = JSON.parse(localStorage.getItem(`cart_${currentTable}`) || "[]");
  if (!cart.length) return;

  try {
    const ref = doc(db, "papadums_orders", currentTable);
    await setDoc(ref, {
      table: currentTable,
      cart,
      updated: serverTimestamp(),
    });
    console.log(`☁️ Synced ${currentTable} to Firestore`);
  } catch (err) {
    console.error("❌ Firestore sync failed:", err);
  }
}
window.syncToFirestore = syncToFirestore;

// --- Auto sync every 5 seconds if online ---
let autoSyncTimer = null;
window.autoSyncToFirestore = () => {
  if (!navigator.onLine) return;
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(syncToFirestore, 5000); // ⏱️ 5s debounce
};

// --- Real-time listener for live multi-device updates ---
export function initFirestoreRealtime() {
  const currentTable = window.currentTable || "table1";
  const ref = doc(db, "papadums_orders", currentTable);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const local = JSON.parse(localStorage.getItem(`cart_${currentTable}`) || "[]");
    const onlineCart = data.cart || [];

    // compare hashes (simple length + total)
    const localHash = local.reduce((s, i) => s + i.qty * i.price, 0) + ":" + local.length;
    const onlineHash = onlineCart.reduce((s, i) => s + i.qty * i.price, 0) + ":" + onlineCart.length;

    if (localHash !== onlineHash) {
      console.log("🔁 Updating local cart from Firestore...");
      localStorage.setItem(`cart_${currentTable}`, JSON.stringify(onlineCart));
      window.cart = onlineCart;
      if (window.renderCart) window.renderCart();
    }
  });
  console.log("👂 Firestore real-time listener active");
}
window.initFirestoreRealtime = initFirestoreRealtime;
