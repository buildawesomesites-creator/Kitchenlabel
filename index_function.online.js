// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import {
  collection, doc, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
const printerIpInput = document.getElementById("printerIp");

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
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else syncStatus.textContent = "🔄 Syncing...";
}

// ---------- Push local data to Firestore ----------
window.syncToFirestore = async function () {
  try {
    const cart = window.cart || [];
    const table = window.currentTable || "table1";
    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });
    setSyncState("online");
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
};

// ---------- Pull from Firestore (fetch latest cloud data) ----------
async function syncFromFirestore() {
  try {
    const table = window.currentTable || "table1";
    const ref = doc(collection(db, "orders"), table);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data();
      const remote = JSON.stringify(data.items || []);
      const local = JSON.stringify(window.cart || []);
      if (remote !== local) {
        console.log("⬇️ Firestore → Updating local cart");
        window.cart = data.items || [];
        localStorage.setItem(`cart_${table}`, remote);
        if (typeof renderCart === "function") renderCart();
      }
    }
  } catch (err) {
    console.warn("⚠️ Pull failed:", err);
    setSyncState("offline");
  }
}

// ---------- Combined Auto Sync (push + pull) ----------
async function autoSync() {
  await window.syncToFirestore();
  await syncFromFirestore();
}
setInterval(autoSync, 5000); // 🔁 every 5 seconds

// ---------- Network Recovery ----------
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — immediate sync");
  autoSync();
});

// ---------- Save order before print ----------
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
  window.saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank");
});
document.getElementById("printInvoice")?.addEventListener("click", () => {
  window.saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank");
});

setSyncState("online");
