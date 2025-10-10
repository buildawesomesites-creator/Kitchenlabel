// index_function.online.js
// Papadums POS — online edition (ES module). Imports firebase_client.js

import { authState, saveOrderToFirestore, subscribeToTable } from "./firebase_client.js";
import {
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import { db } from "./firebase_client.js";

console.log("✅ index_function.online.js loaded (module)");

/* ===== DOM refs ===== */
const productSearch = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const clearBtn = document.getElementById("clearBtn");
const previewInfo = document.getElementById("previewInfo");

let allProducts = [];
let orderItems = [];
let currentTable = "table1";
const LOCAL_KEY = "papadumsOrderCache_v2";

/* ===== Load products (with local fallback) ===== */
async function loadProducts() {
  try {
    const res = await fetch("./products.json");
    allProducts = await res.json();
    localStorage.setItem("offlineProducts", JSON.stringify(allProducts));
  } catch {
    allProducts = JSON.parse(localStorage.getItem("offlineProducts") || "[]");
  }
  populateDatalist();
}
function populateDatalist() {
  const list = document.getElementById("productList");
  list.innerHTML = "";
  allProducts.forEach(p => {
    const o = document.createElement("option");
    o.value = p.name;
    list.appendChild(o);
  });
}

/* ===== Local cache helpers ===== */
function loadAllOrders(){
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
}
function saveAllOrders(data){
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}
function saveCurrentOrderLocally(){
  const all = loadAllOrders();
  all[currentTable] = orderItems;
  saveAllOrders(all);
}

/* ===== Firestore integration ===== */
async function saveCurrentOrderToFirestore(){
  try {
    await saveOrderToFirestore(currentTable, { table: currentTable, items: orderItems });
    saveCurrentOrderLocally();
  } catch (err) {
    console.warn("Firestore save failed, saved locally:", err);
    saveCurrentOrderLocally();
  }
}
function saveCurrentOrder(){
  saveCurrentOrderToFirestore();
}

/* ===== Load current order from local cache ===== */
function loadCurrentOrder(){
  const all = loadAllOrders();
  orderItems = all[currentTable] || [];
  renderPreview();
}

/* ===== Realtime subscription per selected table ===== */
let unsubscribeCurrentTable = null;
function subscribeToCurrentTableRealtime(){
  if (typeof unsubscribeCurrentTable === "function") {
    unsubscribeCurrentTable();
    unsubscribeCurrentTable = null;
  }
  try {
    unsubscribeCurrentTable = subscribeToTable(currentTable, (docData) => {
      if (!docData) {
        const local = loadAllOrders();
        const localItems = local[currentTable] || [];
        if (localItems.length) saveCurrentOrderToFirestore();
        return;
      }
      orderItems = docData.items || [];
      saveAllOrders({ ...loadAllOrders(), [currentTable]: orderItems });
      renderPreview();
    });
  } catch (err) {
    console.warn("subscribeToTable error:", err);
  }
}

/* ===== Table switching UI ===== */
document.querySelectorAll(".table-card").forEach(card=>{
  card.addEventListener("click",()=>{
    document.querySelectorAll(".table-card").forEach(c=>c.classList.remove("active"));
    card.classList.add("active");
    currentTable = card.dataset.table;
    previewInfo.textContent = card.textContent.trim();
    loadCurrentOrder();
    subscribeToCurrentTableRealtime();
  });
});

/* ===== Add item ===== */
addBtn.addEventListener("click", async ()=>{
  const name = productSearch.value.trim();
  const qty = parseInt(qtyInput.value) || 1;
  if (!name) return alert("Enter a product");
  const prod = allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return alert("Not found");

  const existing = orderItems.find(i => i.name === prod.name);
  if (existing) {
    existing.qty += qty;
    existing.amount = existing.qty * existing.price;
  } else {
    orderItems.push({ name: prod.name, price: +prod.price, qty, amount: qty * +prod.price });
  }

  renderPreview();
  saveCurrentOrder();
  productSearch.value = "";
  qtyInput.value = 1;
});

/* ===== Render preview ===== */
function renderPreview(){
  previewBody.innerHTML = "";
  if (orderItems.length === 0){
    previewBody.innerHTML = `<div style="text-align:center;color:#777;padding:18px">No items</div>`;
    totalDisplay.textContent = "0₫";
    return;
  }
  orderItems.forEach((it,i)=>{
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML=`
      <div class="item-left">${it.name}</div>
      <div class="item-right">
        <button class="qty-btn minus" data-i="${i}">-</button>
        <div>${it.qty}</div>
        <button class="qty-btn plus" data-i="${i}">+</button>
        <button class="remove-btn del" data-i="${i}">x</button>
        <div class="price-amount">${(it.amount).toLocaleString()}</div>
      </div>`;
    previewBody.appendChild(row);
  });
  const total = orderItems.reduce((a,b)=>a+b.amount,0);
  totalDisplay.textContent = total.toLocaleString()+"₫";
  attachRowEvents();
}

/* ===== Row button events (persist after change) ===== */
function attachRowEvents(){
  document.querySelectorAll(".plus").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    orderItems[i].qty++;
    orderItems[i].amount=orderItems[i].qty*orderItems[i].price;
    renderPreview(); saveCurrentOrder();
  });
  document.querySelectorAll(".minus").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    if(orderItems[i].qty>1) orderItems[i].qty--;
    else orderItems.splice(i,1);
    orderItems[i] && (orderItems[i].amount=orderItems[i].qty*orderItems[i].price);
    renderPreview(); saveCurrentOrder();
  });
  document.querySelectorAll(".del").forEach(b=>b.onclick=()=>{
    const i=+b.dataset.i;
    orderItems.splice(i,1);
    renderPreview(); saveCurrentOrder();
  });
}

/* ===== Clear all ===== */
clearBtn.onclick=()=>{
  if(confirm("Clear all items?")){
    orderItems=[]; renderPreview(); saveCurrentOrder();
  }
};

/* ===== Print / Invoice (unchanged) ===== */
function openInvoice(file){
  const data={table:currentTable,items:orderItems,time:new Date().toLocaleString()};
  localStorage.setItem("papadumsInvoiceData", JSON.stringify(data));
  window.open(file,"_blank");
}
document.getElementById("printKOT").onclick=()=>openInvoice("kot_browser.html");
document.getElementById("printInv").onclick=()=>openInvoice("invoice_browser.html");
document.getElementById("downloadInv").onclick=()=>openInvoice("invoice_browser.html?download=true");

/* ===== Initialize ===== */
(async function init(){
  try {
    await authState();
    console.log("Firebase auth ready");
  } catch (err) {
    console.warn("authState failed:", err);
  }

  await loadProducts();
  loadCurrentOrder();
  renderPreview();
  subscribeToCurrentTableRealtime();
})();

/* -----------------------------------------------------------
   🔄 SYNC STATUS INDICATOR — Papadums POS
----------------------------------------------------------- */

// Create floating badge if not in HTML
let syncBadge = document.getElementById("syncStatus");
if (!syncBadge) {
  syncBadge = document.createElement("div");
  syncBadge.id = "syncStatus";
  syncBadge.style.cssText = `
    position: fixed;
    bottom: 80px;
    right: 10px;
    background: #0b74ff;
    color: white;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 10px;
    border-radius: 12px;
    box-shadow: 0 0 6px rgba(0,0,0,0.2);
    z-index: 9999;
    transition: background 0.3s, opacity 0.3s;
  `;
  syncBadge.textContent = "🔄 Syncing...";
  document.body.appendChild(syncBadge);
}

/** Update badge text + color */
function setSyncStatus(status) {
  if (!syncBadge) return;
  switch (status) {
    case "online":
      syncBadge.textContent = "✅ Synced";
      syncBadge.style.background = "#28a745";
      fadeOutSyncBadge();
      break;
    case "offline":
      syncBadge.textContent = "⚠️ Offline";
      syncBadge.style.background = "#ff9800";
      syncBadge.style.opacity = "1";
      break;
    case "syncing":
    default:
      syncBadge.textContent = "🔄 Syncing...";
      syncBadge.style.background = "#0b74ff";
      syncBadge.style.opacity = "1";
  }
}

/** Smoothly hide when synced for a while */
function fadeOutSyncBadge() {
  clearTimeout(syncBadge._timer);
  syncBadge._timer = setTimeout(() => {
    syncBadge.style.opacity = "0";
  }, 3000);
}

/** Show again if status changes */
function showBadge() {
  syncBadge.style.opacity = "1";
  clearTimeout(syncBadge._timer);
}

/* ---- Detect network state ---- */
window.addEventListener("online", () => {
  showBadge();
  setSyncStatus("syncing");
});
window.addEventListener("offline", () => {
  showBadge();
  setSyncStatus("offline");
});

/* ---- Firestore Realtime Connection Monitor ---- */
try {
  onSnapshot(collection(db, "orders"), () => {
    if (navigator.onLine) setSyncStatus("online");
  });
} catch (e) {
  console.warn("Sync monitor error:", e);
  setSyncStatus("offline");
}

/* ---- Initial State ---- */
setSyncStatus(navigator.onLine ? "syncing" : "offline");
