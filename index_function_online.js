
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");

// ---------- Sync status ----------
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Synced";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "syncing") syncStatus.textContent = "⏫ Syncing...";
  else if (state === "local") syncStatus.textContent = "🟪 Local";
}

// ---------- Table card status ----------
function updateTableCardStatus(table, status) {
  const card = document.querySelector(`.table-card[data-table="${table}"]`);
  if (!card) return;
  card.classList.remove("syncing", "sync-online", "sync-local");
  if (status === "syncing") card.classList.add("syncing");
  else if (status === "online") {
    card.classList.add("sync-online");
    setTimeout(() => card.classList.remove("sync-online"), 1000);
  }
  else if (status === "local") card.classList.add("sync-local");
}

// ---------- Load cart from localStorage ----------
window.loadTableCartSafe = function(table) {
  const t = table || window.currentTable || "table1";
  const cart = JSON.parse(localStorage.getItem(`cart_${t}`) || "[]");
  window.cart = cart;
  if (typeof window.loadTableCart === "function") window.loadTableCart();
  updateTableCardStatus(t, "local");
};

// ---------- Sync table to Firebase ----------
async function syncTable(table) {
  if (!navigator.onLine) {
    setSyncState("offline");
    updateTableCardStatus(table, "local");
    return;
  }

  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
  updateTableCardStatus(table, "syncing");
  setSyncState("syncing");

  try {
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    updateTableCardStatus(table, "online");
    console.log(`☁️ Synced table ${table} (${cart.length} items)`);
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
    updateTableCardStatus(table, "local");
  }
}

// ---------- Auto-sync current table ----------
window.autoSync = function() {
  if (!window.currentTable) return;
  syncTable(window.currentTable);
};

// ---------- Merge Firebase data for a table ----------
async function mergeFirebaseTable(table, forceLoad=false) {
  if (!navigator.onLine) return;
  try {
    const docSnap = await getDoc(doc(db, "orders", table));
    const remoteCart = docSnap.exists() ? docSnap.data().items || [] : [];
    const localCart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");

    // Force load or empty local -> use remote
    const mergedCart = (forceLoad || localCart.length === 0) ? remoteCart : localCart;

    localStorage.setItem(`cart_${table}`, JSON.stringify(mergedCart));

    if (window.currentTable === table) window.loadTableCartSafe(table);

    console.log(`🔄 Merged Firebase data for table ${table}`);
  } catch (err) {
    console.warn("⚠️ Merge failed for table", table, err);
  }
}

// ---------- Initial load of all tables ----------
async function initTables() {
  const tableCards = Array.from(document.querySelectorAll(".table-card"));
  tableCards.forEach(c => {
    const t = c.dataset.table;
    if (!localStorage.getItem(`cart_${t}`)) localStorage.setItem(`cart_${t}`, JSON.stringify([]));
  });

  if (!window.currentTable) window.currentTable = localStorage.getItem("last_table") || "table1";

  // Force-load table 1 to fix old cached data issue
  await mergeFirebaseTable("table1", true);

  // Load current table safely
  window.loadTableCartSafe(window.currentTable);

  // Highlight UI
  tableCards.forEach(c => c.classList.toggle("active", c.dataset.table === window.currentTable));
}

// ---------- Realtime listener ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "orders");
  onSnapshot(ordersRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      const tableId = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;

      const localCart = JSON.parse(localStorage.getItem(`cart_${tableId}`) || "[]");
      const remoteJSON = JSON.stringify(data.items);
      const localJSON = JSON.stringify(localCart);

      if (localJSON !== remoteJSON) {
        // Merge if local not cleared
        if (localCart.length === 0) localStorage.setItem(`cart_${tableId}`, remoteJSON);

        if (window.currentTable === tableId) {
          window.loadTableCartSafe(tableId);
          updateTableCardStatus(tableId, "online");
        }

        console.log(`🔄 Remote update synced locally: cart_${tableId}`);
      }
    });
  }, err => {
    console.warn("Firestore listener error:", err);
  });
}

// ---------- Online reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  const tableCards = Array.from(document.querySelectorAll(".table-card"));
  tableCards.forEach(c => mergeFirebaseTable(c.dataset.table));
  window.autoSync?.();
});

// ---------- Printer IP ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", e => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}

// ---------- INIT ----------
initTables();
initRealtimeListener();
