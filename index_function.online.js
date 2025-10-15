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

// ---------- Green Blink Visual Effect ----------
function flashGreen() {
  const flash = document.createElement("div");
  flash.style.position = "fixed";
  flash.style.top = 0;
  flash.style.left = 0;
  flash.style.width = "100%";
  flash.style.height = "100%";
  flash.style.background = "rgba(0,255,0,0.15)";
  flash.style.zIndex = 9999;
  flash.style.pointerEvents = "none";
  flash.style.transition = "opacity 0.5s ease";
  document.body.appendChild(flash);
  setTimeout(() => {
    flash.style.opacity = 0;
    setTimeout(() => flash.remove(), 500);
  }, 100);
}

// ---------- Offline-First Sync ----------
window.syncToFirestore = async function (tableName) {
  try {
    const table = tableName || window.currentTable || "table1";
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

// ---------- Auto Sync on Reconnect ----------
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

// ---------- Real-Time Firestore Listener (Live Cross-Device Sync) ----------
function initRealtimeListener() {
  const ordersRef = collection(db, "orders");

  onSnapshot(ordersRef, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      const tableId = change.doc.id;
      const data = change.doc.data();

      if (!data || !data.items) return;

      if (change.type === "added" || change.type === "modified") {
        // Update local cache instantly
        localStorage.setItem(`cart_${tableId}`, JSON.stringify(data.items || []));
        console.log(`🔄 Updated from Firestore: ${tableId}`);

        // Flash green to show sync
        flashGreen();

        // If viewing same table, refresh cart immediately
        if (window.currentTable === tableId && typeof window.loadOfflineCart === "function") {
          window.loadOfflineCart();
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
