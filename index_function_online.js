// =================== Papadums POS — Online Sync & Print Script (Safe) ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// DOM element for sync status (may be null during early load)
const syncStatus = typeof document !== "undefined" ? document.getElementById("syncStatus") : null;

// small helpers
function setSyncState(state, msg = "") {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "updating") syncStatus.textContent = "⏫ Updating...";
  else syncStatus.textContent = msg || "🔄 Syncing...";
}
function glowSyncBar() {
  if (!syncStatus) return;
  syncStatus.style.transition = "box-shadow 0.5s ease";
  syncStatus.style.boxShadow = "0 0 10px 2px rgba(0,255,0,0.55)";
  setTimeout(() => { if (syncStatus) syncStatus.style.boxShadow = "none"; }, 700);
}

// -- Debounced local->remote sync exposed for the UI script to call --
let autoSyncTimer = null;
window.autoSyncToFirestore = function(tableName) {
  const table = tableName || window.currentTable || "table1";
  if (!navigator.onLine) { setSyncState("offline"); return; }
  // debounce rapid calls
  setSyncState("updating");
  if (autoSyncTimer) clearTimeout(autoSyncTimer);
  autoSyncTimer = setTimeout(async () => {
    try {
      const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
      // write to Firestore (offline-first)
      await setDoc(doc(collection(db, "orders"), table), {
        items: cart,
        updatedAt: new Date().toISOString(),
      });
      setSyncState("online");
      glowSyncBar();
      console.log(`☁️ Synced ${table} (${cart.length} items)`);
    } catch (err) {
      console.warn("⚠️ Sync failed:", err);
      setSyncState("offline");
    } finally {
      autoSyncTimer = null;
    }
  }, 900); // 900ms debounce
};

// -- Collection-level real-time listener that writes Firestore -> localStorage --
let firestoreUnsub = null;
window.initFirestoreRealtime = function() {
  try {
    const ordersRef = collection(db, "orders");
    if (firestoreUnsub) firestoreUnsub(); // remove previous if any

    firestoreUnsub = onSnapshot(ordersRef, (snap) => {
      const changedTables = [];
      snap.docChanges().forEach((ch) => {
        const tableId = ch.doc.id;
        const data = ch.doc.data();
        if (!data) return;
        const remote = JSON.stringify(data.items || []);
        const local = localStorage.getItem(`cart_${tableId}`) || "[]";
        if (remote !== local) {
          localStorage.setItem(`cart_${tableId}`, remote);
          changedTables.push(tableId);
          console.log(`🔁 Firestore -> local updated: ${tableId}`);
        }
      });

      // If active table was updated, refresh UI using existing function
      if (changedTables.length && typeof window.loadOfflineCart === "function") {
        // if currentTable was updated, refresh it quickly (allow other storage writes to settle)
        if (changedTables.includes(window.currentTable)) {
          setTimeout(() => {
            try { window.loadOfflineCart(); } catch (e) { console.warn(e); }
            glowSyncBar();
            setSyncState("online");
          }, 150);
        } else {
          // else just mark online and cache updated tables silently
          setSyncState("online");
          glowSyncBar();
        }
      } else {
        setSyncState("online");
      }
    }, (err) => {
      console.warn("⚠️ Firestore realtime error:", err);
      setSyncState("offline");
    });

    console.log("✅ Firestore realtime listener attached (collection orders)");
  } catch (err) {
    console.warn("⚠️ Failed to init Firestore realtime:", err);
    setSyncState("offline");
  }
};

// safe sync-on-reconnect
window.addEventListener("online", () => {
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
    keys.forEach(k => {
      const table = k.replace("cart_", "");
      // do not fire too many writes at once — stagger
      setTimeout(() => window.autoSyncToFirestore(table), 100 * Math.random());
    });
  } catch (e) { console.warn(e); }
});

// expose a safe sync-to-firestore function for manual use
window.syncToFirestore = async function(tableName) {
  const table = tableName || window.currentTable || "table1";
  try {
    setSyncState("updating");
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    glowSyncBar();
    console.log(`☁️ Manual sync done: ${table}`);
  } catch (err) {
    console.warn("⚠️ Manual sync failed:", err);
    setSyncState("offline");
  }
};

// provide a noop saveOrderDataForPrint only if not provided by the offline file
if (typeof window.saveOrderDataForPrint !== "function") {
  window.saveOrderDataForPrint = function(tableOverride) {
    const table = tableOverride || window.currentTable || "table1";
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    const orderData = { table, time: new Date().toLocaleString("vi-VN",{hour12:false}), items: cart, total: cart.reduce((s,i)=>s+i.price*i.qty,0) };
    localStorage.setItem("papadumsInvoiceData", JSON.stringify(orderData));
    return orderData;
  };
}

// auto-init when the script loads (safe to call multiple times)
if (typeof window.initFirestoreRealtime === "function") {
  // allow the offline script to control startup; if that script calls initFirestoreRealtime it is fine.
} else {
  // expose for offline script to call
  window.initFirestoreRealtime = window.initFirestoreRealtime || window.initFirestoreRealtime;
}
