// =================== Papadums POS — Online Sync (Minimal, Safe) ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");

// Small UI helpers (non-invasive)
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
  syncStatus.style.transition = "box-shadow 0.4s ease";
  syncStatus.style.boxShadow = "0 0 10px 2px rgba(0,255,0,0.45)";
  setTimeout(() => { if (syncStatus) syncStatus.style.boxShadow = "none"; }, 700);
}

// Restore last active table on load (this does NOT overwrite your product logic)
// Important: index_function_work.js defines currentTable = "table1" initially. We override it with persisted value here,
// then trigger loadOfflineCart() so the UI shows the correct data after refresh.
(function restoreLastTableAndLoad() {
  try {
    const last = localStorage.getItem("last_table");
    if (last) {
      // set global currentTable if present (index_function_work defines it; if not, no-op)
      window.currentTable = last;
      // If your offline script exposed loadOfflineCart, call it to load the restored table immediately
      if (typeof window.loadOfflineCart === "function") {
        // small timeout to ensure DOM and offline script finished initialising
        setTimeout(() => {
          try { window.loadOfflineCart(); }
          catch (e) { console.warn("loadOfflineCart() threw:", e); }
        }, 50);
      }
    }
  } catch (e) {
    console.warn("Failed to restore last table:", e);
  }
})();

// ------- Minimal autoSync (debounced) used by offline UI ----------
let __autoSyncTimer = null;

/**
 * window.autoSyncToFirestore([tableName])
 * - debounced, writes localStorage cart_<table> -> Firestore doc orders/<table>
 * - offline-safe: if navigator.onLine === false, will set offline status and return
 */
window.autoSyncToFirestore = function(tableName) {
  const table = tableName || window.currentTable || "table1";

  if (!navigator.onLine) {
    setSyncState("offline");
    return;
  }

  setSyncState("updating");
  if (__autoSyncTimer) clearTimeout(__autoSyncTimer);
  __autoSyncTimer = setTimeout(async () => {
    try {
      const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
      // write to Firestore doc: orders/<table>
      await setDoc(doc(collection(db, "orders"), table), {
        items: cart,
        updatedAt: new Date().toISOString(),
      });
      console.log(`☁️ autoSync: wrote orders/${table} (${cart.length} items)`);
      setSyncState("online");
      glowSyncBar();
    } catch (err) {
      console.warn("autoSyncToFirestore failed:", err);
      setSyncState("offline");
    } finally {
      __autoSyncTimer = null;
    }
  }, 800); // small debounce to coalesce rapid updates
};

// ------- Minimal collection-level listener: Firestore -> localStorage -------
let unsubscribe = null;
function attachCollectionListener() {
  try {
    const ordersRef = collection(db, "orders");
    if (unsubscribe) unsubscribe();

    unsubscribe = onSnapshot(ordersRef, (snapshot) => {
      const updated = [];
      snapshot.docChanges().forEach(change => {
        const tableId = change.doc.id;
        const data = change.doc.data();
        if (!data) return;
        const remoteJSON = JSON.stringify(data.items || []);
        const localJSON = localStorage.getItem(`cart_${tableId}`) || "[]";
        if (remoteJSON !== localJSON) {
          localStorage.setItem(`cart_${tableId}`, remoteJSON);
          updated.push(tableId);
          console.log(`🔄 Firestore -> localStorage updated: cart_${tableId}`);
        }
      });

      if (updated.length) {
        // If the active table was updated remotely, reload it immediately
        if (window.currentTable && updated.includes(window.currentTable) && typeof window.loadOfflineCart === "function") {
          try {
            // slight delay to allow any concurrent localStorage writes to finish
            setTimeout(() => {
              try { window.loadOfflineCart(); }
              catch (e) { console.warn("loadOfflineCart() after remote update failed:", e); }
            }, 75);
          } catch (e) { console.warn(e); }
        }
        glowSyncBar();
      }
      setSyncState("online");
    }, (err) => {
      console.warn("Firestore listener error:", err);
      setSyncState("offline");
    });

    console.log("✅ Firestore collection listener attached (orders)");
  } catch (e) {
    console.warn("Failed to attach Firestore listener:", e);
    setSyncState("offline");
  }
}
attachCollectionListener();

// ------- Safe manual sync function (optional) -------
window.syncToFirestore = async function(tableName) {
  const table = tableName || window.currentTable || "table1";
  if (!navigator.onLine) { setSyncState("offline"); return; }
  try {
    setSyncState("updating");
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    glowSyncBar();
    console.log(`☁️ syncToFirestore: wrote orders/${table}`);
  } catch (err) {
    console.warn("syncToFirestore failed:", err);
    setSyncState("offline");
  }
};

// ------- On reconnect, attempt to push all local carts (staggered) -------
window.addEventListener("online", () => {
  try {
    setSyncState("updating");
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
    let delay = 0;
    keys.forEach(k => {
      const table = k.replace("cart_", "");
      setTimeout(() => window.syncToFirestore(table), delay);
      delay += 150;
    });
  } catch (e) {
    console.warn(e);
    setSyncState("offline");
  }
});
