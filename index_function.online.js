// ✅ Papadums POS — Online Function Script (with Sync Indicator)
console.log("✅ index_function.online.js loaded (module)");

/* ====== Firebase Import (Safe Fallback) ====== */
let authState = async () => Promise.resolve();
let saveOrderToFirestore = async () => Promise.resolve();
let subscribeToTable = () => () => {};

try {
  const mod = await import("./firebase_client.js");
  authState = mod.authState;
  saveOrderToFirestore = mod.saveOrderToFirestore;
  subscribeToTable = mod.subscribeToTable;
  console.log("✅ Firebase module loaded");
} catch (err) {
  console.warn("⚠️ Firebase offline or not found — running locally");
}

/* ===== DOM Refs ===== */
const productSearch = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const clearBtn = document.getElementById("clearBtn");
const previewInfo = document.getElementById("previewInfo");

/* ===== Sync Indicator ===== */
const header = document.querySelector("header");
const syncIndicator = document.createElement("div");
syncIndicator.id = "syncStatus";
syncIndicator.textContent = "Offline";
syncIndicator.style.cssText = `
  position:absolute; right:10px; top:10px;
  background:#ffffff33; color:#fff;
  border-radius:12px; padding:5px 10px;
  font-size:13px; font-weight:600;
  transition:all 0.3s ease;
`;
header.style.position = "relative";
header.appendChild(syncIndicator);

function setSyncStatus(status, color) {
  syncIndicator.textContent = status;
  syncIndicator.style.background = color;
}

/* ===== Variables ===== */
let allProducts = [];
let orderItems = [];
let currentTable = "table1";
const LOCAL_KEY = "papadumsOrderCache_v2";

/* ===== Load Products (with local fallback) ===== */
async function loadProducts() {
  try {
    const res = await fetch("./products.json");
    allProducts = await res.json();
    localStorage.setItem("offlineProducts", JSON.stringify(allProducts));
    console.log("📦 Products loaded:", allProducts.length);
  } catch (err) {
    console.warn("⚠️ Using offline products cache");
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

/* ===== Local Cache ===== */
function loadAllOrders() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
}
function saveAllOrders(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}
function saveCurrentOrderLocally() {
  const all = loadAllOrders();
  all[currentTable] = orderItems;
  saveAllOrders(all);
}

/* ===== Firestore Sync ===== */
async function saveCurrentOrderToFirestore() {
  try {
    setSyncStatus("Syncing...", "orange");
    await saveOrderToFirestore(currentTable, {
      table: currentTable,
      items: orderItems,
    });
    saveCurrentOrderLocally();
    setSyncStatus("Synced ✅", "green");
    setTimeout(() => setSyncStatus("Idle", "#0b74ff"), 2000);
  } catch (err) {
    console.warn("Firestore save failed:", err);
    setSyncStatus("Offline (Saved Locally)", "gray");
    saveCurrentOrderLocally();
  }
}
function saveCurrentOrder() {
  saveCurrentOrderToFirestore();
}

/* ===== Load Order ===== */
function loadCurrentOrder() {
  const all = loadAllOrders();
  orderItems = all[currentTable] || [];
  renderPreview();
}

/* ===== Realtime Table Sync ===== */
let unsubscribeCurrentTable = null;
function subscribeToCurrentTableRealtime() {
  if (typeof unsubscribeCurrentTable === "function") {
    unsubscribeCurrentTable();
    unsubscribeCurrentTable = null;
  }
  try {
    unsubscribeCurrentTable = subscribeToTable(currentTable, docData => {
      if (!docData) {
        const local = loadAllOrders();
        const localItems = local[currentTable] || [];
        if (localItems.length) saveCurrentOrderToFirestore();
        return;
      }
      orderItems = docData.items || [];
      saveAllOrders({ ...loadAllOrders(), [currentTable]: orderItems });
      renderPreview();
      setSyncStatus("Updated 🔄", "green");
      setTimeout(() => setSyncStatus("Idle", "#0b74ff"), 2000);
    });
  } catch (err) {
    console.warn("subscribeToTable error:", err);
  }
}

/* ===== Table Switching ===== */
document.querySelectorAll(".table-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".table-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    currentTable = card.dataset.table;
    previewInfo.textContent = card.textContent.trim();
    loadCurrentOrder();
    subscribeToCurrentTableRealtime();
  });
});

/* ===== Add Item ===== */
addBtn.addEventListener("click", async () => {
  const name = productSearch.value.trim();
  const qty = parseInt(qtyInput.value) || 1;
  if (!name) return alert("Enter a product name");

  const prod = allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return alert("Product not found!");

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

/* ===== Render Preview ===== */
function renderPreview() {
  previewBody.innerHTML = "";
  if (orderItems.length === 0) {
    previewBody.innerHTML = `<div style="text-align:center;color:#777;padding:18px">No items</div>`;
    totalDisplay.textContent = "0₫";
    return;
  }

  orderItems.forEach((it, i) => {
    const row = document.createElement("div");
    row.className = "item-row";
    row.innerHTML = `
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

  const total = orderItems.reduce((a, b) => a + b.amount, 0);
  totalDisplay.textContent = total.toLocaleString() + "₫";
  attachRowEvents();
}

/* ===== Row Events ===== */
function attachRowEvents() {
  document.querySelectorAll(".plus").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    orderItems[i].qty++;
    orderItems[i].amount = orderItems[i].qty * orderItems[i].price;
    renderPreview();
    saveCurrentOrder();
  });

  document.querySelectorAll(".minus").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (orderItems[i].qty > 1) orderItems[i].qty--;
    else orderItems.splice(i, 1);
    if (orderItems[i]) orderItems[i].amount = orderItems[i].qty * orderItems[i].price;
    renderPreview();
    saveCurrentOrder();
  });

  document.querySelectorAll(".del").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    orderItems.splice(i, 1);
    renderPreview();
    saveCurrentOrder();
  });
}

/* ===== Clear All ===== */
clearBtn.onclick = () => {
  if (confirm("Clear all items?")) {
    orderItems = [];
    renderPreview();
    saveCurrentOrder();
  }
};

/* ===== Invoice Printing ===== */
function openInvoice(file) {
  const data = { table: currentTable, items: orderItems, time: new Date().toLocaleString() };
  localStorage.setItem("papadumsInvoiceData", JSON.stringify(data));
  window.open(file, "_blank");
}

document.getElementById("printKOT").onclick = () => openInvoice("kot_browser.html");
document.getElementById("printInv").onclick = () => openInvoice("invoice_browser.html");
document.getElementById("downloadInv").onclick = () => openInvoice("invoice_browser.html?download=true");

/* ===== Initialize ===== */
(async function init() {
  try {
    await authState();
    console.log("Firebase auth ready");
    setSyncStatus("Connected ✅", "green");
  } catch (err) {
    console.warn("authState failed:", err);
    setSyncStatus("Offline", "gray");
  }

  await loadProducts();
  loadCurrentOrder();
  renderPreview();
  subscribeToCurrentTableRealtime();
})();
