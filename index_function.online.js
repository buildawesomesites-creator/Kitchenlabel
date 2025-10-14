// =================== Papadums POS — Online Sync & Print Script ===================
console.log("✅ index_function.online.js loaded");

// Import Firebase helper
import {
  db,
  saveOrderToFirestore,
  subscribeToTable,
  authState
} from "./firebase_client.js";

/* ===== DOM Refs ===== */
const productSearch = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const datalist = document.getElementById("productList");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const previewInfo = document.getElementById("previewInfo");
const syncStatus = document.getElementById("syncStatus");
const tables = document.querySelectorAll(".table-card");

/* ===== State ===== */
let currentTable = "table1";
let products = [];
let cart = JSON.parse(localStorage.getItem("cart_" + currentTable) || "[]");
let isSyncing = false;
let unsubRealtime = null;

/* ===== Sync Status UI ===== */
function setSyncState(state) {
  if (!syncStatus) return;
  syncStatus.className = state;
  if (state === "syncing") {
    syncStatus.textContent = "🔄 Syncing…";
    syncStatus.style.background = "#FFD54F"; // Yellow
  } else if (state === "offline") {
    syncStatus.textContent = "🔴 Offline";
    syncStatus.style.background = "#E57373"; // Red
  } else {
    syncStatus.textContent = "🟢 Online";
    syncStatus.style.background = "#81C784"; // Green
  }
}

/* ===== Load Products ===== */
const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/buildawesomesites-creator/Kitchenlabel/main/products.json";

async function loadProducts() {
  try {
    const res = await fetch(GITHUB_RAW_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("GitHub fetch failed");
    products = await res.json();
    localStorage.setItem("offlineProducts", JSON.stringify(products));
  } catch {
    try {
      const resLocal = await fetch("./products.json");
      products = await resLocal.json();
      localStorage.setItem("offlineProducts", JSON.stringify(products));
    } catch {
      products = JSON.parse(localStorage.getItem("offlineProducts") || "[]");
    }
  }
  populateProductList();
}

function populateProductList() {
  if (!datalist) return;
  datalist.innerHTML = "";
  products.forEach(p => {
    const opt = document.createElement("option");
    opt.value = p.name;
    datalist.appendChild(opt);
  });
}

/* ===== Render Cart ===== */
function renderCart() {
  previewBody.innerHTML = "";
  if (cart.length === 0) {
    previewBody.innerHTML = `<div style="text-align:center;color:#777;padding:18px">No items</div>`;
  } else {
    cart.forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "item-row";
      div.innerHTML = `
        <div class="item-left">${item.name}</div>
        <div class="item-right">
          <button class="qty-btn" data-i="${i}" data-type="minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-i="${i}" data-type="plus">+</button>
          <strong class="price-amount">${(item.qty * item.price).toFixed(0)}₫</strong>
          <button class="remove-btn" data-i="${i}">x</button>
        </div>`;
      previewBody.appendChild(div);
    });
  }
  const total = cart.reduce((t, i) => t + i.price * i.qty, 0);
  totalDisplay.textContent = total.toFixed(0) + "₫";
  localStorage.setItem("cart_" + currentTable, JSON.stringify(cart));
}

/* ===== Modify Qty / Remove ===== */
previewBody.addEventListener("click", (e) => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  if (e.target.dataset.type === "plus") cart[i].qty++;
  else if (e.target.dataset.type === "minus" && cart[i].qty > 1) cart[i].qty--;
  else if (e.target.classList.contains("remove-btn")) cart.splice(i, 1);
  renderCart();
  queueSync();
});

/* ===== Add / Clear Buttons ===== */
addBtn.addEventListener("click", () => {
  const name = productSearch.value.trim();
  if (!name) return;
  const qty = parseInt(qtyInput.value || "1");
  const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return alert("Product not found!");
  const existing = cart.find(i => i.name === prod.name);
  if (existing) existing.qty += qty;
  else cart.push({ ...prod, qty });
  renderCart();
  queueSync();
  productSearch.value = "";
  qtyInput.value = 1;
});

clearBtn.addEventListener("click", () => {
  if (confirm("Clear all items?")) {
    cart = [];
    renderCart();
    queueSync();
  }
});

/* ===== Table Switch ===== */
tables.forEach(t => t.addEventListener("click", () => {
  tables.forEach(el => el.classList.remove("active"));
  t.classList.add("active");
  currentTable = t.dataset.table;
  previewInfo.textContent = currentTable;
  cart = JSON.parse(localStorage.getItem("cart_" + currentTable) || "[]");
  renderCart();
  subscribeToFirestore();
}));

/* ===== Firestore Sync ===== */
let syncTimeout;
function queueSync() {
  clearTimeout(syncTimeout);
  syncTimeout = setTimeout(syncToFirestore, 800);
}

async function syncToFirestore() {
  try {
    if (isSyncing) return;
    isSyncing = true;
    setSyncState("syncing");
    await saveOrderToFirestore(currentTable, { table: currentTable, items: cart });
    setSyncState("online");
    isSyncing = false;
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
    isSyncing = false;
  }
}

function subscribeToFirestore() {
  if (unsubRealtime) unsubRealtime(); // stop old listener
  unsubRealtime = subscribeToTable(currentTable, (data) => {
    if (!data || !data.items) return;
    const localUpdated = localStorage.getItem("updatedAt_" + currentTable);
    if (!localUpdated || (data.lastModified?.seconds || 0) > (localUpdated || 0)) {
      cart = data.items;
      localStorage.setItem("cart_" + currentTable, JSON.stringify(cart));
      localStorage.setItem("updatedAt_" + currentTable, data.lastModified?.seconds || 0);
      renderCart();
      console.log(`🔄 Updated from Firestore: ${currentTable}`);
    }
    setSyncState("online");
  });
}

/* ===== Network Reconnect Auto-Sync ===== */
window.addEventListener("online", () => {
  console.log("🌐 Back online, resyncing...");
  syncToFirestore();
});

/* ===== Save Order for Print ===== */
function saveOrderDataForPrint() {
  const orderData = {
    table: currentTable,
    time: new Date().toLocaleString("vi-VN", { hour12: false }),
    items: cart.map(i => ({
      name: i.name,
      price: i.price,
      qty: i.qty,
      unit: i.unit || ""
    })),
    discount: 0,
    billNo: "INV" + Date.now(),
    type: "dinein"
  };
  localStorage.setItem("papadumsInvoiceData", JSON.stringify(orderData));
  console.log("💾 Order data saved for print:", orderData);
}

/* ===== Scroll Fix for Native Keyboard ===== */
productSearch.addEventListener("focus", () => {
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 300);
});
qtyInput.addEventListener("focus", () => {
  setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 300);
});

/* ===== Auto Add from Datalist ===== */
let _autoAddTimer;
function tryAutoAddFromDatalist() {
  clearTimeout(_autoAddTimer);
  _autoAddTimer = setTimeout(() => {
    const name = productSearch.value.trim();
    if (!name) return;
    const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
    if (!prod) return;
    const options = Array.from(datalist?.querySelectorAll("option") || []);
    const isOption = options.some(o => o.value.toLowerCase() === name.toLowerCase());
    if (!isOption) return;

    const qty = parseInt(qtyInput.value || "1");
    const existing = cart.find(i => i.name === prod.name);
    if (existing) existing.qty += qty;
    else cart.push({ ...prod, qty });

    renderCart();
    queueSync();

    productSearch.value = "";
    qtyInput.value = 1;
  }, 120);
}
productSearch.addEventListener("change", tryAutoAddFromDatalist);
productSearch.addEventListener("input", tryAutoAddFromDatalist);

/* ===== Footer Buttons ===== */
document.getElementById("printKOT")?.addEventListener("click", () => {
  saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank", "width=400,height=600");
});
document.getElementById("printInv")?.addEventListener("click", () => {
  saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank", "width=400,height=600");
});
document.getElementById("downloadInv")?.addEventListener("click", async () => {
  saveOrderDataForPrint();
  const blob = new Blob([document.documentElement.outerHTML], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Papadums_Invoice.html";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
});

/* ===== Init App ===== */
await authState(); // wait for Firebase ready
await loadProducts();
renderCart();
subscribeToFirestore();
setSyncState("online");
console.log("🚀 Papadums POS ready & synced");
