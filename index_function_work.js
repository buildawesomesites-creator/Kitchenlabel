// =================== Papadums POS — Online Sync & Print Script (Final Stable) ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
let syncTimer = null;
let refreshTimer = null;

// ---------- Sync Indicator ----------
function setSyncState(state, msg = "") {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "updating") syncStatus.textContent = "⏫ Updating...";
  else syncStatus.textContent = msg || "🔄 Syncing...";
}

// ---------- Subtle Glow Effect ----------
function glowSyncBar() {
  if (!syncStatus) return;
  syncStatus.style.transition = "box-shadow 0.5s ease";
  syncStatus.style.boxShadow = "0 0 10px 2px rgba(0,255,0,0.6)";
  setTimeout(() => (syncStatus.style.boxShadow = "none"), 800);
}

// ---------- Remember last active table ----------
window.addEventListener("beforeunload", () => {
  if (window.currentTable) localStorage.setItem("last_table", window.currentTable);
});
window.currentTable = localStorage.getItem("last_table") || "table1";

// ---------- Offline-First Sync ----------
window.syncToFirestore = async function (tableName) {
  const table = tableName || window.currentTable || "table1";
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");

  try {
    setSyncState("updating");
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    console.log(`☁️ Synced ${table} (${cart.length} items)`);
    setSyncState("online");
    glowSyncBar();
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
};

// ---------- Sync all tables ----------
function syncAllTables() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
  keys.forEach(k => {
    const table = k.replace("cart_", "");
    window.syncToFirestore(table);
  });
}

// ---------- Local change watcher ----------
window.addEventListener("storage", (e) => {
  if (!e.key || !e.key.startsWith("cart_")) return;
  clearTimeout(syncTimer);
  setSyncState("updating");
  syncTimer = setTimeout(() => {
    const table = e.key.replace("cart_", "");
    window.syncToFirestore(table);
  }, 800);
});

// ---------- Real-time Firestore Listener ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "orders");

  onSnapshot(ordersRef, (snapshot) => {
    let updatedTables = [];

    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;

      const remoteJSON = JSON.stringify(data.items);
      const localJSON = localStorage.getItem(`cart_${tableId}`) || "[]";

      // Compare to local; update only if changed
      if (remoteJSON !== localJSON) {
        localStorage.setItem(`cart_${tableId}`, remoteJSON);
        console.log(`🔄 Remote update synced locally: ${tableId}`);
        updatedTables.push(tableId);
      }
    });

    // Refresh if active table changed
    if (updatedTables.includes(window.currentTable)) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (typeof window.loadOfflineCart === "function") {
          window.loadOfflineCart();
          glowSyncBar();
        }
      }, 400);
    }

    setSyncState("online");
  }, (err) => {
    console.warn("⚠️ Firestore listener error:", err);
    setSyncState("offline");
  });
}
initRealtimeListener();

// ---------- Re-Sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  syncAllTables();
});

// ---------- Save order data for print ----------
window.saveOrderDataForPrint = function (tableOverride) {
  const table = tableOverride || window.currentTable || "table1";
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");

  const orderData = {
    table,
    time: new Date().toLocaleString("vi-VN", { hour12: false }),
    items: cart.map(i => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
      unit: i.unit || "",
    })),
    total: cart.reduce((s, i) => s + i.price * i.qty, 0),
  };

  localStorage.setItem("papadumsInvoiceData", JSON.stringify(orderData));
  return orderData;
};

// ---------- Print buttons ----------
document.getElementById("printKOT")?.addEventListener("click", () => {
  window.saveOrderDataForPrint(window.currentTable);
  window.open("kot_browser.html", "_blank");
});
document.getElementById("printInv")?.addEventListener("click", () => {
  window.saveOrderDataForPrint(window.currentTable);
  window.open("invoice_browser.html", "_blank");
});

// ---------- Init ----------
setSyncState("online");
console.log("🔥 Firestore multi-table sync initialized successfully");
