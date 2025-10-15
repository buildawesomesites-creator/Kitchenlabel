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
  else if (state === "syncing") syncStatus.textContent = "⏫ Syncing...";
}

// ---------- Sync single table ----------
async function syncTable(table) {
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
  try {
    setSyncState("syncing");
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    const card = document.querySelector(`.table-card[data-table="${table}"]`);
    if (card) {
      card.classList.add("sync-online");
      setTimeout(() => card.classList.remove("sync-online"), 1000);
    }
    console.log(`☁️ Synced table ${table} (${cart.length} items)`);
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
}

// ---------- Auto-sync current table ----------
window.autoSync = function() {
  if (!window.currentTable) return;
  const table = window.currentTable;
  const card = document.querySelector(`.table-card[data-table="${table}"]`);
  if (card) card.classList.add("syncing");
  syncTable(table).finally(() => {
    if (card) {
      card.classList.remove("syncing");
      card.classList.add("sync-online");
      setTimeout(() => card.classList.remove("sync-online"), 1000);
    }
  });
};

// ---------- Listen Firebase for updates ----------
function initRealtimeListener() {
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
        if (window.currentTable === tableId && typeof window.loadTableCart === "function") {
          window.loadTableCart();
        }
        const card = document.querySelector(`.table-card[data-table="${tableId}"]`);
        if (card) {
          card.classList.add("sync-online");
          setTimeout(() => card.classList.remove("sync-online"), 1000);
        }
        console.log(`🔄 Remote update synced locally: cart_${tableId}`);
      }
    });
    setSyncState("online");
  }, (err) => {
    console.warn("Firestore listener error:", err);
    setSyncState("offline");
  });
}
initRealtimeListener();

// ---------- Re-sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  Object.keys(localStorage)
    .filter(k => k.startsWith("cart_"))
    .forEach(k => syncTable(k.replace("cart_", "")));
});

// ---------- Printer IP ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
