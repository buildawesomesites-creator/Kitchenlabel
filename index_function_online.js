console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");

function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else if (state === "syncing") syncStatus.textContent = "⏫ Syncing...";
}

// ---------- Sync single table with indicator ----------
async function syncTable(table) {
  const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
  const card = document.querySelector(`.table-card[data-table="${table}"]`);
  if (card) card.classList.add("syncing");

  try {
    setSyncState("syncing");
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
    if (card) {
      card.classList.remove("syncing");
      card.classList.add("sync-online");
      setTimeout(() => card.classList.remove("sync-online"), 1000);
    }
    console.log(`☁️ Synced table ${table} (${cart.length} items)`);
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
    if (card) card.classList.remove("syncing");
  }
}

// ---------- Auto-sync current table ----------
window.autoSync = function() {
  if (!window.currentTable) return;
  syncTable(window.currentTable);
};

// ---------- Initial fetch all tables ----------
async function fetchAllTables() {
  if (!navigator.onLine) return setSyncState("offline");

  setSyncState("syncing");
  const tables = Array.from(document.querySelectorAll(".table-card")).map(c => c.dataset.table);

  for (const table of tables) {
    try {
      const docSnap = await getDoc(doc(db, "orders", table));
      if (docSnap.exists()) {
        const data = docSnap.data();
        localStorage.setItem(`cart_${table}`, JSON.stringify(data.items || []));
        console.log(`🔄 Loaded table ${table} from Firebase`);
      }
    } catch (err) {
      console.warn("⚠️ Fetch table failed:", table, err);
    }
  }
  setSyncState("online");

  if (typeof window.loadTableCart === "function") window.loadTableCart();
}

// ---------- Real-time listener ----------
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

// ---------- Re-sync on reconnect ----------
window.addEventListener("online", () => {
  console.log("🌐 Connection restored — syncing all tables");
  fetchAllTables().then(() => {
    window.autoSync?.();
  });
});

// ---------- Printer IP ----------
const printerIpInput = document.getElementById("printerIp");
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}

// ---------- INIT ----------
fetchAllTables();
initRealtimeListener();
