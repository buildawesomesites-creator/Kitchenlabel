// ===================
// Papadums POS — Online Sync & Print (Web + Native)
// ===================
console.log("✅ index_function.online.js loaded");

import {
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
  syncStatus.style.transition = "background 0.3s ease";
  if (state === "syncing") {
    syncStatus.textContent = "🔄 Syncing…";
    syncStatus.style.background = "#FFD54F"; // Yellow
    syncStatus.classList.add("blinking");
  } else {
    syncStatus.classList.remove("blinking");
    if (state === "offline") {
      syncStatus.textContent = "🔴 Offline";
      syncStatus.style.background = "#E57373"; // Red
    } else {
      syncStatus.textContent = "🟢 Online";
      syncStatus.style.background = "#81C784"; // Green
    }
  }
}

/* ===== Load Products ===== */
const PRODUCTS_URL = "https://buildawesomesites-creator.github.io/Kitchenlabel/products.json";

async function loadProducts() {
  try {
    const res = await fetch(PRODUCTS_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error("GitHub fetch failed");
    products = await res.json();
    localStorage.setItem("offlineProducts", JSON.stringify(products));
  } catch {
    products = JSON.parse(localStorage.getItem("offlineProducts") || "[]");
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
  if (!cart.length) {
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
          <strong>${(item.qty * item.price).toFixed(0)}₫</strong>
          <button class="remove-btn" data-i="${i}">x</button>
        </div>`;
      previewBody.appendChild(div);
    });
  }
  const total = cart.reduce((t, i) => t + i.price * i.qty, 0);
  totalDisplay.textContent = total.toFixed(0) + "₫";
  localStorage.setItem("cart_" + currentTable, JSON.stringify(cart));
}

/* ===== Qty / Remove ===== */
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
  if (isSyncing) return;
  isSyncing = true;
  setSyncState("syncing");
  try {
    await saveOrderToFirestore(currentTable, { table: currentTable, items: cart });
    setSyncState("online");
  } catch (err) {
    console.warn("⚠️ Sync failed:", err);
    setSyncState("offline");
  } finally {
    isSyncing = false;
  }
}

function subscribeToFirestore() {
  if (unsubRealtime) unsubRealtime(); // stop old listener
  unsubRealtime = subscribeToTable(currentTable, (data) => {
    if (!data || !data.items) return;
    const lastLocal = parseInt(localStorage.getItem("updatedAt_" + currentTable) || 0);
    const remoteTime = data.lastModified?.seconds || 0;
    if (!lastLocal || remoteTime > lastLocal) {
      cart = data.items;
      localStorage.setItem("cart_" + currentTable, JSON.stringify(cart));
      localStorage.setItem("updatedAt_" + currentTable, remoteTime);
      renderCart();
      console.log(`🔄 Updated from Firestore: ${currentTable}`);
    }
    if (!isSyncing) setSyncState("online");
  });
}

/* ===== Network Reconnect Auto-Sync ===== */
window.addEventListener("online", () => {
  console.log("🌐 Back online, resyncing...");
  queueSync();
});

/* ===== Dark Dropdown Only (No Native Datalist) ===== */
const productDropdown = document.getElementById("productDropdown");

// Disable native datalist
productSearch.removeAttribute("list");
productSearch.setAttribute("autocomplete", "off");

// Show matching products in dark dropdown
productSearch.addEventListener("input", () => {
  const term = productSearch.value.toLowerCase().trim();
  productDropdown.innerHTML = "";
  if (!term) return (productDropdown.style.display = "none");

  const matches = products.filter(p => p.name.toLowerCase().includes(term));
  matches.forEach(p => {
    const div = document.createElement("div");
    div.textContent = p.name;
    div.addEventListener("click", () => {
      productSearch.value = p.name;
      productDropdown.style.display = "none";
      addBtn.click(); // triggers existing add button logic
    });
    productDropdown.appendChild(div);
  });

  productDropdown.style.display = matches.length ? "block" : "none";
});

// Hide dropdown when clicking outside
document.addEventListener("click", e => {
  if (!productSearch.contains(e.target) && !productDropdown.contains(e.target)) {
    productDropdown.style.display = "none";
  }
});

/* ===== Init ===== */
(async () => {
  await authState();
  await loadProducts();
  renderCart();
  subscribeToFirestore();
  setSyncState("online");
  console.log("🚀 Papadums POS ready & synced");
})();
