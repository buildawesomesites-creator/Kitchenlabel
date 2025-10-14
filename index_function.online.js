// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function_online.js loaded");

import { db } from "./firebase_config.js";
import {
  collection, doc, setDoc, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const syncStatus = document.getElementById("syncStatus");
const printerIpInput = document.getElementById("printerIp");

if (printerIpInput) {
  printerIpInput.value = localStorage.getItem("printerIp") || "";
  printerIpInput.addEventListener("input", (e) => {
    localStorage.setItem("printerIp", e.target.value.trim());
  });
}
function getPrinterIP() {
  return localStorage.getItem("printerIp") || "";
}

function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "online") syncStatus.textContent = "✅ Online";
  else if (state === "offline") syncStatus.textContent = "⚠️ Offline";
  else syncStatus.textContent = "🔄 Syncing...";
}

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

window.addEventListener("online", () => {
  console.log("🌐 Reconnected");
  window.syncToFirestore();
});

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

document.getElementById("printKOT")?.addEventListener("click", () => {
  const order = window.saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank");
});
document.getElementById("printInvoice")?.addEventListener("click", () => {
  const order = window.saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank");
});

setSyncState("online");
