// =================== Papadums POS — Online Sync (Fixed Version) ===================
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

// ---------- Save last active table ----------
function saveLastTable() {
  localStorage.setItem("last_table", window.currentTable);
}

// ---------- Load table cart safely ----------
function loadTableCartSafe(table) {
  window.currentTable = table;
  saveLastTable();
  if (typeof window.loadTableCart === "function") window.loadTableCart();
  document.querySelectorAll(".table-card").forEach((c) => {
    c.classList.toggle("active", c.dataset.table === table);
  });
}

// ---------- Restore last active table on page load ----------
(function restoreLastTable() {
  const lastTable = localStorage.getItem("last_table") || "table1";
  loadTableCartSafe(lastTable);
})();

// ---------- Sync current table to Firestore ----------
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

// ---------- Firestore listener with safe merge ----------
(function attachListener() {
  const ordersRef = collection(db, "orders");
  onSnapshot(ordersRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;

      const localKey = `cart_${tableId}`;
      const localJSON = localStorage.getItem(localKey) || "[]";
      const remoteJSON = JSON.stringify(data.items);

      // Only overwrite if remote has different content
      if (localJSON !== remoteJSON) {
        // If cleared locally, skip overwrite
        if (localJSON === "[]") return;
        localStorage.setItem(localKey, remoteJSON);
        console.log(`🔄 Remote update synced locally: ${localKey}`);
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

// ---------- Clear table sync helper ----------
window.clearCurrentTable = function () {
  window.cart = [];
  if (typeof window.renderCart === "function") window.renderCart();
  const key = `cart_${window.currentTable}`;
  localStorage.setItem(key, JSON.stringify([]));
  saveLastTable();
  window.syncToFirestore();
  console.log(`🗑️ Cleared table ${window.currentTable}`);
};

// ---------- Re-sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing current table");
  window.syncToFirestore();
});

// ---------- Printer IP ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
