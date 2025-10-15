// =================== Papadums POS — Online Sync & Print Script (Final Ultra-Stable) ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
let syncTimer = null;
let listeners = {}; // active table listeners

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
  syncStatus.style.transition = "box-shadow 0.6s ease";
  syncStatus.style.boxShadow = "0 0 8px 2px rgba(0,255,0,0.5)";
  setTimeout(() => (syncStatus.style.boxShadow = "none"), 1000);
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

// ---------- Local change watcher ----------
window.addEventListener("storage", (e) => {
  if (!e.key || !e.key.startsWith("cart_")) return;
  clearTimeout(syncTimer);
  setSyncState("updating");
  syncTimer = setTimeout(() => {
    const table = e.key.replace("cart_", "");
    window.syncToFirestore(table);
  }, 700);
});

// ---------- Instant Table Switch Loader ----------
window.switchTable = function (tableName) {
  if (!tableName) return;
  window.currentTable = tableName;
  localStorage.setItem("last_table", tableName);
  console.log("🪑 Switched to", tableName);

  // Always load local first
  if (typeof window.loadOfflineCart === "function") window.loadOfflineCart();

  // Reattach listener for this table
  attachTableListener(tableName);
};

// ---------- Real-time Listener per Table ----------
function attachTableListener(tableName) {
  if (listeners[tableName]) return; // already listening

  const ref = doc(collection(db, "orders"), tableName);
  listeners[tableName] = onSnapshot(ref, (docSnap) => {
    if (!docSnap.exists()) return;
    const data = docSnap.data();
    if (!data || !data.items) return;

    const remoteJSON = JSON.stringify(data.items);
    const localJSON = localStorage.getItem(`cart_${tableName}`) || "[]";

    if (remoteJSON !== localJSON) {
      localStorage.setItem(`cart_${tableName}`, remoteJSON);
      console.log(`🔄 Remote synced locally: ${tableName}`);
      if (tableName === window.currentTable && typeof window.loadOfflineCart === "function") {
        window.loadOfflineCart();
        glowSyncBar();
      }
    }
    setSyncState("online");
  }, (err) => {
    console.warn("⚠️ Listener error for", tableName, err);
    setSyncState("offline");
  });
}

// ---------- Initialize All Listeners ----------
function initAllListeners() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
  if (keys.length === 0) keys.push("cart_table1");
  keys.forEach(k => attachTableListener(k.replace("cart_", "")));
}
initAllListeners();

// ---------- Auto Re-Sync ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
  keys.forEach(k => window.syncToFirestore(k.replace("cart_", "")));
});

// ---------- Save Order for Print ----------
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

// ---------- Print Buttons ----------
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
attachTableListener(window.currentTable);
console.log("🔥 Firestore real-time sync initialized per-table (vFinal Ultra-Stable)");
