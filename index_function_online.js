// =================== Papadums POS — Online Sync & Print Script (Final) ===================
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
  syncStatus.style.boxShadow = "0 0 12px 3px rgba(0,255,0,0.6)";
  setTimeout(() => (syncStatus.style.boxShadow = "none"), 800);
}

// ---------- Remember last active table ----------
window.addEventListener("beforeunload", () => {
  if (window.currentTable) localStorage.setItem("last_table", window.currentTable);
});
window.currentTable = localStorage.getItem("last_table") || "table1";

// ---------- Offline-First Sync ----------
window.syncToFirestore = async function (tableName) {
  try {
    const table = tableName || window.currentTable || "table1";
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    if (!cart.length) return;

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

// ---------- Auto Sync when local changes ----------
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith("cart_")) {
    clearTimeout(syncTimer);
    setSyncState("updating");
    syncTimer = setTimeout(() => {
      const table = e.key.replace("cart_", "");
      window.syncToFirestore(table);
    }, 1500);
  }
});

// ---------- Auto Sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing all tables");
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
    keys.forEach(k => {
      const table = k.replace("cart_", "");
      const cart = JSON.parse(localStorage.getItem(k) || "[]");
      if (cart.length) window.syncToFirestore(table);
    });
  } catch (err) {
    console.error("Sync on reconnect failed:", err);
  }
});

// ---------- Real-Time Firestore Listener (Improved) ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "orders");

  onSnapshot(ordersRef, (snapshot) => {
    let updatedTables = [];

    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;

      // Compare with local copy
      const localData = localStorage.getItem(`cart_${tableId}`);
      const localJSON = localData ? JSON.parse(localData) : [];
      const localHash = JSON.stringify(localJSON);
      const remoteHash = JSON.stringify(data.items);

      // Only update if remote changed
      if (localHash !== remoteHash) {
        localStorage.setItem(`cart_${tableId}`, remoteHash);
        console.log(`🔄 Firestore update detected for: ${tableId}`);
        updatedTables.push(tableId);
      }
    });

    // Refresh active table immediately if changed
    if (updatedTables.includes(window.currentTable)) {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        if (typeof window.loadOfflineCart === "function") {
          console.log("🔁 Refreshing active table:", window.currentTable);
          window.loadOfflineCart();
          setSyncState("online");
          glowSyncBar();
        }
      }, 500);
    }

    // Preload all updated tables silently (so they’re ready when you switch)
    updatedTables.forEach((t) => {
      if (t !== window.currentTable) {
        const data = JSON.parse(localStorage.getItem(`cart_${t}`) || "[]");
        if (data.length) console.log(`📦 Cached updated table: ${t}`);
      }
    });

    setSyncState("online");
  }, (err) => {
    console.warn("⚠️ Firestore listener error:", err);
    setSyncState("offline");
  });
}

window.initFirestoreRealtime = initRealtimeListener;
initRealtimeListener();

// ---------- Save order for print ----------
window.saveOrderDataForPrint = function () {
  const table = window.currentTable || "table1";
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
  const orderData = {
    table,
    time: new Date().toLocaleString("vi-VN", { hour12: false }),
    items: cart.map((i) => ({
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

// ---------- Print ----------
document.getElementById("printKOT")?.addEventListener("click", () => {
  window.saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank");
});
document.getElementById("printInvoice")?.addEventListener("click", () => {
  window.saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank");
});

// ---------- Init ----------
setSyncState("online");
