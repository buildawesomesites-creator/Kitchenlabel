// index_function.js — Papadums Blue Layout 7 (Final, Oct 2025)

import { db } from "./firebase_config.js";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

// 🔹 Local state
let currentTable = "table1";
let orderItems = [];

// 🔹 Format number as currency
function formatCurrency(num) {
  return num.toLocaleString("vi-VN") + "₫";
}

// 🔹 Load local order data on startup
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("papadumsOrder");
  if (saved) {
    const data = JSON.parse(saved);
    currentTable = data.table || "table1";
    orderItems = data.items || [];
  }
  updateUI();
  loadProducts();
  initRealtimeListener(); // 👈 start live Firestore sync
});

// 🔹 Save to localStorage
function saveOrder() {
  localStorage.setItem("papadumsOrder", JSON.stringify({
    table: currentTable,
    items: orderItems
  }));
}

// 🔹 Load products for autocomplete (from local products.json)
function loadProducts() {
  fetch("products.json")
    .then(res => res.json())
    .then(products => {
      const list = document.getElementById("productList");
      list.innerHTML = "";
      products.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.name;
        list.appendChild(opt);
      });
    })
    .catch(() => console.warn("⚠️ No products.json found (offline mode)"));
}

// 🔹 Add item
document.getElementById("addBtn").addEventListener("click", () => {
  const name = document.getElementById("productSearch").value.trim();
  const qty = parseInt(document.getElementById("qty").value) || 1;
  if (!name) return alert("Enter product name");

  const existing = orderItems.find(i => i.name === name);
  if (existing) existing.qty += qty;
  else orderItems.push({ name, qty, price: 0 });

  document.getElementById("productSearch").value = "";
  document.getElementById("qty").value = 1;

  saveOrder();
  updateUI();
});

// 🔹 Update UI
function updateUI() {
  const body = document.getElementById("previewBody");
  const totalDisplay = document.getElementById("totalDisplay");
  const info = document.getElementById("previewInfo");

  document.querySelectorAll(".table-card").forEach(el => {
    el.classList.toggle("active", el.dataset.table === currentTable);
  });
  info.textContent = currentTable.replace("table", "Table ");

  if (orderItems.length === 0) {
    body.innerHTML = `<div style="text-align:center;color:#777;padding:18px">No items</div>`;
    totalDisplay.textContent = "0₫";
    return;
  }

  body.innerHTML = "";
  let total = 0;
  orderItems.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
      <div class="item-left">${item.name}</div>
      <div class="item-right">
        <button class="qty-btn minus">-</button>
        <span>${item.qty}</span>
        <button class="qty-btn plus">+</button>
        <button class="remove-btn">x</button>
      </div>
    `;
    row.querySelector(".minus").onclick = () => {
      if (item.qty > 1) item.qty--;
      else orderItems.splice(i, 1);
      saveOrder(); updateUI();
    };
    row.querySelector(".plus").onclick = () => {
      item.qty++;
      saveOrder(); updateUI();
    };
    row.querySelector(".remove-btn").onclick = () => {
      orderItems.splice(i, 1);
      saveOrder(); updateUI();
    };
    body.appendChild(row);
  });

  totalDisplay.textContent = formatCurrency(total);
}

// 🔹 Clear order
document.getElementById("clearBtn").addEventListener("click", () => {
  if (confirm("Clear all items?")) {
    orderItems = [];
    saveOrder();
    updateUI();
  }
});

// 🔹 Table switching
document.querySelectorAll(".table-card").forEach(el => {
  el.addEventListener("click", () => {
    currentTable = el.dataset.table;
    saveOrder();
    updateUI();
  });
});

// 🔹 Print KOT
document.getElementById("printKOT").addEventListener("click", () => {
  if (orderItems.length === 0) return alert("No items to print");

  const kotData = {
    table: currentTable,
    items: orderItems,
    staff: "Quỳnh Anh",
    timestamp: new Date().toISOString(),
    type: "KOT"
  };

  // Save to Firestore
  addDoc(collection(db, "orders"), {
    ...kotData,
    createdAt: serverTimestamp()
  }).then(() => console.log("✅ KOT saved to Firestore"))
    .catch(e => console.warn("⚠️ Firestore save failed (offline)", e));

  localStorage.setItem("papadumsKOT", JSON.stringify(kotData));
  window.open("kot_browser.html", "_blank");
});

// 🔹 Print Invoice
document.getElementById("printInv").addEventListener("click", () => {
  if (orderItems.length === 0) return alert("No items to print");

  const invData = {
    table: currentTable,
    items: orderItems,
    staff: "Quỳnh Anh",
    timestamp: new Date().toISOString(),
    type: "Invoice"
  };

  localStorage.setItem("papadumsInvoice", JSON.stringify(invData));
  window.open("invoice.html", "_blank");
});

// 🔹 Download Invoice
document.getElementById("downloadInv").addEventListener("click", () => {
  if (orderItems.length === 0) return alert("No items to download");

  const invData = {
    table: currentTable,
    items: orderItems,
    staff: "Quỳnh Anh",
    timestamp: new Date().toISOString(),
    type: "Invoice"
  };

  localStorage.setItem("papadumsInvoice", JSON.stringify(invData));
  window.open("invoice_download.html", "_blank");
});

// 🔹 🔥 Real-time Firestore updates (multi-user live sync)
function initRealtimeListener() {
  try {
    const ordersRef = collection(db, "orders");

    onSnapshot(ordersRef, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log("📡 Live Firestore data:", orders);

      // Optional: Live update of tab title
      const kotCount = orders.filter(o => o.type === "KOT").length;
      const invCount = orders.filter(o => o.type === "Invoice").length;
      document.title = `Papadums POS — ${kotCount} KOT | ${invCount} Invoices`;
    });

    console.log("✅ Firestore live listener active");
  } catch (e) {
    console.warn("⚠️ Firestore listener failed", e);
  }
}
