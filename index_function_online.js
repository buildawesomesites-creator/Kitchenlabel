// =================== Papadums POS — Online Sync (Safe Minimal Version) ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");

// ---------- Sync Status ----------
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else syncStatus.textContent = "🔄 Syncing...";
}

// ---------- Restore last active table ----------
(function restoreLastTable() {
  const lastTable = localStorage.getItem("last_table");
  if (lastTable && window.currentTable !== lastTable) {
    window.currentTable = lastTable;
    console.log("🔄 Restored last active table:", window.currentTable);
    // Call offline logic to load cart
    if (typeof window.loadTableCart === "function") window.loadTableCart();
    // Update UI table cards highlight
    document.querySelectorAll(".table-card").forEach((c) => {
      c.classList.toggle("active", c.dataset.table === window.currentTable);
    });
  }
})();

// ---------- Simple Firestore sync ----------
window.syncToFirestore = async function () {
  if (!navigator.onLine) return setSyncState("offline");
  try {
    setSyncState("updating");
    const cart = window.cart || [];
    const table = window.currentTable || "table1";
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    console.log(`☁️ Synced table ${table} (${cart.length} items)`);
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
};

// ---------- Firestore listener ----------
(function attachListener() {
  const ordersRef = collection(db, "orders");
  onSnapshot(ordersRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;
      const localJSON = localStorage.getItem(`cart_${tableId}`) || "[]";
      const remoteJSON = JSON.stringify(data.items);
      if (localJSON !== remoteJSON) {
        localStorage.setItem(`cart_${tableId}`, remoteJSON);
        console.log(`🔄 Remote update synced locally: cart_${tableId}`);
        if (window.currentTable === tableId && typeof window.loadTableCart === "function") {
          window.loadTableCart();
        }
      }
    });
    setSyncState("online");
  }, (err) => {
    console.warn("Firestore listener error:", err);
    setSyncState("offline");
  });
})();

// ---------- Re-sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing current table");
  window.syncToFirestore();
});

// ---------- Printer IP (optional) ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
