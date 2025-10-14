// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import {
  collection,
  doc,
  setDoc,
  onSnapshot,
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
const printerIpInput = document.getElementById("printerIp");

// ---------- Printer IP Save/Load ----------
if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
function getPrinterIP() {
  return localStorage.getItem("printerIp") || "";
}

// ---------- Sync Status Display ----------
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else syncStatus.textContent = "🔄 Syncing...";
}

// ---------- Push Local Cart to Firestore ----------
window.syncToFirestore = async function () {
  try {
    const cart = window.cart || [];
    const table = window.currentTable || "table1";
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    console.log(`☁️ Synced to Firestore (${table})`, cart);
    setSyncState("online");
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
};

// ---------- Real-time Firestore Listener ----------
function startRealtimeListener() {
  const table = window.currentTable || "table1";
  const ref = doc(collection(db, "orders"), table);

  onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    const remote = data.items || [];

    // Compare remote vs local to avoid overwrite loop
    const localJSON = JSON.stringify(window.cart || []);
    const remoteJSON = JSON.stringify(remote);
    if (localJSON === remoteJSON) return;

    console.log(`🔄 Remote update for ${table}:`, remote);
    window.cart = remote;
    localStorage.setItem(`cart_${table}`, JSON.stringify(remote));
    if (typeof renderCart === "function") renderCart();
  });
}

// ---------- Auto Resync on Network Recovery ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing now...");
  window.syncToFirestore();
});

// ---------- Auto Start ----------
startRealtimeListener();
setSyncState("online");

// ---------- Print Data ----------
window.saveOrderDataForPrint = function () {
  const cart = window.cart || [];
  const table = window.currentTable || "table1";
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
