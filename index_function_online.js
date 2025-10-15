console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
const defaultTables = ["Table 1", "Table 2", "Table 3", "Online", "Take Away"];

// ---------- Sync status ----------
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Synced";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "syncing") syncStatus.textContent = "⏫ Syncing...";
  else if (state === "local") syncStatus.textContent = "🟪 Local";
}

// ---------- Table card indicator ----------
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

// ---------- Load cart safely ----------
window.loadTableCartSafe = function(table) {
  const t = table || window.currentTable || "Table 1";
  const cart = JSON.parse(localStorage.getItem(`cart_${t}`) || "[]");
  window.cart = cart;
  if (typeof window.loadTableCart === "function") window.loadTableCart();
  updateTableCardStatus(t, "local");
};

// ---------- Sync table to Firebase ----------
async function syncTable(table) {
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
  updateTableCardStatus(table, "syncing");
  setSyncState("syncing");

  try {
    await setDoc(doc(collection(db, "tables"), table), {
      items: cart,
      updatedAt: new Date().toISOString()
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

// ---------- Merge Firebase data ----------
async function mergeFirebaseTable(table, force=false) {
  try {
    const docSnap = await getDoc(doc(db, "tables", table));
    const remoteCart = docSnap.exists() ? docSnap.data().items || [] : [];
    const localCart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");

    const merged = (force || localCart.length === 0) ? remoteCart : localCart;
    localStorage.setItem(`cart_${table}`, JSON.stringify(merged));

    if (window.currentTable === table) window.loadTableCartSafe(table);
    console.log(`🔄 Merged Firebase data for ${table}`);
  } catch (err) {
    console.warn("⚠️ Merge failed:", table, err);
  }
}

// ---------- Initialize tables ----------
async function initTables() {
  const tableCards = Array.from(document.querySelectorAll(".table-card"));
  tableCards.forEach(c => {
    const t = c.dataset.table;
    if (!localStorage.getItem(`cart_${t}`)) localStorage.setItem(`cart_${t}`, JSON.stringify([]));
  });

  window.currentTable = localStorage.getItem("last_table") || "Table 1";
  await mergeFirebaseTable("Table 1", true); // ensure first table gets latest
  window.loadTableCartSafe(window.currentTable);

  tableCards.forEach(c => c.classList.toggle("active", c.dataset.table === window.currentTable));
}

// ---------- Real-time listener ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "tables");
  onSnapshot(ordersRef, snapshot => {
    snapshot.docChanges().forEach(change => {
      const table = change.doc.id;
      const data = change.doc.data();
      if (!data || !data.items) return;

      const localCart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
      const remoteJSON = JSON.stringify(data.items);
      const localJSON = JSON.stringify(localCart);

      if (localJSON !== remoteJSON) {
        if (localCart.length === 0) localStorage.setItem(`cart_${table}`, remoteJSON);
        if (window.currentTable === table) window.loadTableCartSafe(table);
        updateTableCardStatus(table, "online");
        console.log(`🔄 Remote update synced: ${table}`);
      }
    });
  }, err => console.warn("Firestore listener error:", err));
}

// ---------- Reconnect handler ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  defaultTables.forEach(t => mergeFirebaseTable(t));
  window.autoSync?.();
});

// ---------- Printer IP ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", e => localStorage.setItem("printerIp", e.target.value.trim()));
}

// ---------- INIT ----------
initTables();
initRealtimeListener();
