console.log("✅ index_function.js loaded");

// === DOM references ===
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

// === load products ===
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

// === localStorage per-table ===
function loadAllOrders() {
  return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}");
}
function saveAllOrders(data) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(data));
}
function saveCurrentOrder() {
  const all = loadAllOrders();
  all[currentTable] = orderItems;
  saveAllOrders(all);
}
function loadCurrentOrder() {
  const all = loadAllOrders();
  orderItems = all[currentTable] || [];
  renderPreview();
}

// === table switching ===
document.querySelectorAll(".table-card").forEach(card => {
  card.addEventListener("click", () => {
    document.querySelectorAll(".table-card").forEach(c => c.classList.remove("active"));
    card.classList.add("active");
    currentTable = card.dataset.table;
    previewInfo.textContent = card.textContent.trim();
    loadCurrentOrder();
  });
});

// === add item ===
addBtn.addEventListener("click", () => {
  const name = productSearch.value.trim();
  const qty = parseInt(qtyInput.value) || 1;
  if (!name) return alert("Enter a product");
  const prod = allProducts.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return alert("Product not found");

  const existing = orderItems.find(i => i.name === name);
  if (existing) {
    existing.qty += qty;
    existing.amount = existing.qty * existing.price;
  } else {
    orderItems.push({
      name: prod.name,
      price: +prod.price,
      qty,
      amount: qty * +prod.price
    });
  }

  renderPreview();
  saveCurrentOrder();
  productSearch.value = "";
  qtyInput.value = 1;
});

// === render preview ===
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

// === row buttons ===
function attachRowEvents() {
  document.querySelectorAll(".plus").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    orderItems[i].qty++;
    orderItems[i].amount = orderItems[i].qty * orderItems[i].price;
    renderPreview(); saveCurrentOrder();
  });
  document.querySelectorAll(".minus").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (orderItems[i].qty > 1) orderItems[i].qty--;
    else orderItems.splice(i, 1);
    if (orderItems[i]) orderItems[i].amount = orderItems[i].qty * orderItems[i].price;
    renderPreview(); saveCurrentOrder();
  });
  document.querySelectorAll(".del").forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    orderItems.splice(i, 1);
    renderPreview(); saveCurrentOrder();
  });
}

// === clear all ===
clearBtn.onclick = () => {
  if (confirm("Clear all items?")) {
    orderItems = [];
    renderPreview();
    saveCurrentOrder();
  }
};

// === print / invoice ===

// 🍳 KOT (Kitchen Order Ticket)
function openKOT(file) {
  saveCurrentOrder();
  const kotItems = orderItems.map(it => ({
    name: it.name,
    unit: it.unit || "",
    qty: it.qty
  }));
  const kotData = {
    table: currentTable,
    items: kotItems,
    time: new Date().toLocaleString(),
    staff: "Quỳnh Anh"
  };
  localStorage.setItem("papadumsKOTData", JSON.stringify(kotData));
  // Small delay to ensure data saved
  setTimeout(() => window.open(file, "_blank"), 150);
}

// 🧾 INVOICE (Customer Receipt)
function openInvoice(file) {
  saveCurrentOrder();

  const fullItems = orderItems.map(it => ({
    name: it.name,
    qty: it.qty,
    price: it.price || 0,
    amount: (it.price || 0) * (it.qty || 1)
  }));

  const invoiceData = {
    table: currentTable,
    items: fullItems,
    time: new Date().toLocaleString(),
    staff: "Quỳnh Anh"
  };

  localStorage.setItem("papadumsInvoiceData", JSON.stringify(invoiceData));
  setTimeout(() => window.open(file, "_blank"), 150);
}

// === button handlers ===
document.getElementById("printKOT").onclick = () => openKOT("kot_browser.html");
document.getElementById("printInv").onclick = () => openInvoice("invoice_browser.html");
document.getElementById("downloadInv").onclick = () => openInvoice("invoice_browser.html?download=true");

// === init ===
window.addEventListener("load", async () => {
  await loadProducts();
  loadCurrentOrder();
  renderPreview();
});