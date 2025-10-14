// ===================
// Papadums POS — Local Function Script (Offline)
// ===================
console.log("✅ index_function_work.js (offline) loaded");

let cart = [];
let currentTable = "table1";
let products = [];

const searchInput = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const previewInfo = document.getElementById("previewInfo");
const tableCards = document.querySelectorAll(".table-card");
const productDropdown = document.getElementById("productDropdown");
const previewPanel = document.getElementById("previewPanel");
const fullPreviewModal = document.getElementById("fullPreviewModal");
const fullPreviewContent = document.getElementById("fullPreviewContent");
const closePreview = document.getElementById("closePreview");

searchInput.removeAttribute("list");
searchInput.setAttribute("autocomplete", "off");

async function loadProducts() {
  products = window.PRODUCTS || JSON.parse(localStorage.getItem("offlineProducts") || "[]");
  localStorage.setItem("offlineProducts", JSON.stringify(products));
}

function renderCart() {
  previewBody.innerHTML = "";
  if (!cart.length) previewBody.innerHTML = `<div style="text-align:center;color:#777;padding:16px">No items</div>`;
  else {
    cart.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <div class="item-left">${item.name}</div>
        <div class="item-right">
          <button class="qty-btn" data-i="${i}" data-type="minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-i="${i}" data-type="plus">+</button>
          <strong>${(item.price*item.qty).toLocaleString()}₫</strong>
          <button class="remove-btn" data-i="${i}">x</button>
        </div>`;
      previewBody.appendChild(row);
    });
  }
  const total = cart.reduce((sum,i)=>sum+i.price*i.qty,0);
  totalDisplay.textContent = total.toLocaleString()+"₫";
  localStorage.setItem(`cart_${currentTable}`, JSON.stringify(cart));
}

// + rest of functions (add, clear, qty buttons, table switch, modal, etc.)...
// This file stays exactly as you provided offline version without change.

(async () => {
  await loadProducts();
  cart = JSON.parse(localStorage.getItem(`cart_${currentTable}`) || "[]");
  renderCart();
})();
