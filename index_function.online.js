// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import { collection, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

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

// ---------- Offline-First Sync ----------
window.syncToFirestore = async function () {
  try {
    const table = window.currentTable || "table1";
    const cart = JSON.parse(localStorage.getItem(`cart_${table}`) || "[]");
    if (!cart.length) return;

    setSyncState("syncing");

    await setDoc(doc(collection(db, "orders"), table), {
      items: cart,
      updatedAt: new Date().toISOString(),
    });

    setSyncState("online");
    console.log(`☁️ Synced ${table} (${cart.length} items)`);
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  }
};

// Auto sync on reconnect
window.addEventListener("online", () => {
  console.log("🌐 Reconnected — syncing all tables");
  try {
    const keys = Object.keys(localStorage).filter(k => k.startsWith("cart_"));
    keys.forEach(k => {
      const table = k.replace("cart_", "");
      const cart = JSON.parse(localStorage.getItem(k) || "[]");
      if (cart.length) window.syncToFirestore(table, cart);
    });
  } catch {}
});

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

setSyncState("online");
