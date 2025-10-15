// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
const printerIpInput = document.getElementById("printerIp");
let syncTimer = null;
let autoSyncDebounce = null;

// ---------- Printer IP ----------
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
function getPrinterIP() {
  return localStorage.getItem("printerIp") || "";
}

// ---------- Sync Indicator ----------
function setSyncState(state, msg = "") {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "updating") syncStatus.textContent = "⏫ Updating...";
  else syncStatus.textContent = msg || "🔄 Syncing...";
}

// ---------- Subtle Green Glow Effect ----------
function glowSyncBar() {
  if (!syncStatus) return;
  syncStatus.style.transition = "box-shadow 0.5s ease";
  syncStatus.style.boxShadow = "0 0 12px 3px rgba(0,255,0,0.45)";
  setTimeout(() => {
    if (syncStatus) syncStatus.style.boxShadow = "none";
  }, 800);
}

// ---------- Core: push current table cart to Firestore ----------
window.syncToFirestore = async function (tableName) {
  try {
    const table = tableName || window.currentTable || "table1";
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    if (!cart.length) {
      // If empty cart, we still update Firestore to keep devices consistent (optional)
      // return;
    }

    setSyncState("updating");

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
  }
};

// ---------- Provide autoSyncToFirestore (debounced) so UI can call it ----------
window.autoSyncToFirestore = function (tableName) {
  // prefer explicit tableName, otherwise use currentTable
  const table = tableName || window.currentTable || "table1";

  // If offline, set status and skip scheduling push
  if (!navigator.onLine) {
    setSyncState("offline");
    return;
  }

  // debounce consecutive calls (2 seconds)
  if (autoSyncDebounce) clearTimeout(autoSyncDebounce);
  setSyncState("updating");
  autoSyncDebounce = setTimeout(() => {
    window.syncToFirestore(table);
    autoSyncDebounce = null;
  }, 2000); // 2s debounce
};

// ---------- Auto Sync when other tabs/windows modify localStorage ----------
window.addEventListener("storage", (e) => {
  if (e.key && e.key.startsWith("cart_")) {
    // schedule immediate sync for that table (debounced)
    const table = e.key.replace("cart_", "");
    if (autoSyncDebounce) clearTimeout(autoSyncDebounce);
    setSyncState("updating");
    autoSyncDebounce = setTimeout(() => {
      window.syncToFirestore(table);
      autoSyncDebounce = null;
    }, 1000);
  }
});

// ---------- Auto Sync on Reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing all tables");
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
    keys.forEach(k => {
      const table = k.replace("cart_", "");
      const cart = JSON.parse(localStorage.getItem(k) || "[]");
      if (cart.length) {
        // call sync with slight stagger to avoid bursts
        setTimeout(() => window.syncToFirestore(table), 200);
      }
    });
  } catch (err) {
    console.error("Sync on reconnect failed:", err);
  }
});

// ---------- Real-Time Firestore Listener (Cross-Device Live Sync) ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "orders");

  onSnapshot(ordersRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();

      if (!data) return;
      const remoteItems = data.items || [];

      // Read local and compare
      const localRaw = localStorage.getItem(`cart_${tableId}`);
      const localItems = localRaw ? JSON.parse(localRaw) : [];

      const localHash = JSON.stringify(localItems);
      const remoteHash = JSON.stringify(remoteItems);

      // If they differ, write remote -> local (remote wins)
      if (localHash !== remoteHash) {
        localStorage.setItem(`cart_${tableId}`, remoteHash);
        console.log(`🔁 Firestore -> localStorage updated for ${tableId}`);

        // visual cue
        glowSyncBar();

        // If user is viewing that table, reload UI cart
        if (window.currentTable === tableId && typeof window.loadOfflineCart === "function") {
          // small timeout to ensure storage is written
          setTimeout(() => window.loadOfflineCart(), 50);
        }
      }
    });

    setSyncState("online");
  }, (err) => {
    console.warn("⚠️ Firestore listener error:", err);
    setSyncState("offline");
  });
}

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

// ---------- Print Buttons ----------
document.getElementById("printKOT")?.addEventListener("click", () => {
  const order = window.saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank");
});
document.getElementById("printInvoice")?.addEventListener("click", () => {
  const order = window.saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank");
});

// ---------- Init ----------
setSyncState("online");

// Optional: attempt an initial sync for current table when script loads & online
if (navigator.onLine) {
  setTimeout(() => {
    try { window.autoSyncToFirestore(); } catch (e) {}
  }, 500);
}
