console.log("✅ index_function_work.js loaded");

let cart = [];
let currentTable = "table1";
let products = [];
const isNative = /wv|Android.*Version/.test(navigator.userAgent) || window.AndroidInterface;

// ---------- Elements ----------
const searchInput = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const previewBody = document.getElementById("previewBody");
const totalDisplay = document.getElementById("totalDisplay");
const tableCards = document.querySelectorAll(".table-card");
const previewInfo = document.getElementById("previewInfo");
const printKOT = document.getElementById("printKOT");
const printInv = document.getElementById("printInv");
const productDropdown = document.getElementById("productDropdown");

// ---------- Product Load ----------
const GITHUB_RAW_URL =
  "https://raw.githubusercontent.com/buildawesomesites-creator/Kitchenlabel/main/products.json";

async function loadProducts() {
  console.log("⏳ Loading products...");
  try {
    const res = await fetch(GITHUB_RAW_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("GitHub fetch failed");
    products = await res.json();
    localStorage.setItem("offlineProducts", JSON.stringify(products));
  } catch {
    try {
      const resLocal = await fetch("./products.json", { cache: "no-store" });
      if (!resLocal.ok) throw new Error("Local fetch failed");
      products = await resLocal.json();
      localStorage.setItem("offlineProducts", JSON.stringify(products));
    } catch {
      products = JSON.parse(localStorage.getItem("offlineProducts") || "[]");
    }
  }
  populateProductList();
}

function populateProductList() {
  const datalist = document.getElementById("productList");
  datalist.innerHTML = "";
  products.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.name;
    datalist.appendChild(opt);
  });
  console.log("✅ Product list ready");
}

// ---------- Search Dropdown ----------
searchInput.addEventListener("input", () => {
  const term = searchInput.value.toLowerCase().trim();
  productDropdown.innerHTML = "";
  if (!term) return (productDropdown.style.display = "none");

  const matches = products.filter((p) => p.name.toLowerCase().includes(term));
  matches.forEach((p) => {
    const div = document.createElement("div");
    div.textContent = p.name;
    div.addEventListener("click", () => {
      searchInput.value = p.name;
      productDropdown.style.display = "none";
      autoAddProduct();
    });
    productDropdown.appendChild(div);
  });
  productDropdown.style.display = matches.length ? "block" : "none";
});
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target)) productDropdown.style.display = "none";
});

// ---------- Auto Add Product ----------
function autoAddProduct() {
  const name = searchInput.value.trim();
  const qty = parseInt(qtyInput.value || "1");
  const prod = products.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return;

  const existing = cart.find((i) => i.name === prod.name);
  if (existing) existing.qty += qty;
  else cart.push({ ...prod, qty });

  renderCart();
  saveTableCart();
  window.autoSync?.();
  searchInput.value = "";
  qtyInput.value = 1;
}

// ---------- Add / Clear ----------
addBtn.addEventListener("click", autoAddProduct);
clearBtn.addEventListener("click", () => {
  if (confirm("Clear all items?")) {
    cart = [];
    renderCart();
    saveTableCart();
    window.autoSync?.();
  }
});

// ---------- Render Cart ----------
function renderCart() {
  previewBody.innerHTML = "";
  if (!cart.length) {
    previewBody.innerHTML = '<div style="text-align:center;color:#777;padding:16px">No items</div>';
  } else {
    cart.forEach((item, i) => {
      const row = document.createElement("div");
      row.className = "item-row";
      row.innerHTML = `
        <div class="item-left">${item.name}</div>
        <div class="item-right">
          <button class="qty-btn" data-i="${i}" data-type="minus">−</button>
          <span>${item.qty}</span>
          <button class="qty-btn" data-i="${i}" data-type="plus">+</button>
          <strong>${(item.price * item.qty).toLocaleString()}₫</strong>
          <button class="remove-btn" data-i="${i}">x</button>
        </div>`;
      previewBody.appendChild(row);
    });
  }
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  totalDisplay.textContent = total.toLocaleString() + "₫";
}

// ---------- Qty / Remove ----------
previewBody.addEventListener("click", (e) => {
  const i = e.target.dataset.i;
  if (i === undefined) return;
  if (e.target.dataset.type === "plus") cart[i].qty++;
  else if (e.target.dataset.type === "minus" && cart[i].qty > 1) cart[i].qty--;
  else if (e.target.classList.contains("remove-btn")) cart.splice(i, 1);
  renderCart();
  saveTableCart();
  window.autoSync?.();
});

// ---------- Table Switching ----------
tableCards.forEach((card) => {
  card.addEventListener("click", () => {
    tableCards.forEach((c) => c.classList.remove("active"));
    card.classList.add("active");
    currentTable = card.dataset.table;
    previewInfo.textContent = card.textContent.trim();
    loadTableCart();
  });
});

// ---------- Table Cart Storage ----------
function saveTableCart() {
  localStorage.setItem(`cart_${currentTable}`, JSON.stringify(cart));
}
function loadTableCart() {
  cart = JSON.parse(localStorage.getItem(`cart_${currentTable}`) || "[]");
  renderCart();
}

// ---------- Save Order for Printing ----------
function saveOrderDataForPrint() {
  const savedCart = JSON.parse(localStorage.getItem(`cart_${currentTable}`) || "[]");
  const orderData = {
    table: currentTable,
    time: new Date().toLocaleString("vi-VN", { hour12: false }),
    items: savedCart.map((i) => ({
      name: i.name,
      qty: i.qty,
      price: i.price,
    })),
    total: savedCart.reduce((s, i) => s + i.qty * i.price, 0),
  };
  localStorage.setItem("papadumsInvoiceData", JSON.stringify(orderData));
}

// ---------- Footer Buttons ----------
printKOT.addEventListener("click", () => {
  saveOrderDataForPrint();
  window.open("kot_browser.html", "_blank");
});
printInv.addEventListener("click", () => {
  saveOrderDataForPrint();
  window.open("invoice_browser.html", "_blank");
});

// ---------- Full Preview Modal ----------
const previewPanel = document.getElementById("previewPanel");
const fullPreviewModal = document.getElementById("fullPreviewModal");
const fullPreviewContent = document.getElementById("fullPreviewContent");
const closePreview = document.getElementById("closePreview");

previewPanel.addEventListener("click", () => {
  fullPreviewContent.innerHTML =
    previewBody.innerHTML +
    `<div style='padding:12px;font-weight:800;text-align:right;border-top:1px solid #eee;margin-top:10px;'>Total: ${totalDisplay.textContent}</div>`;
  fullPreviewModal.style.display = "flex";
});
closePreview.onclick = () => (fullPreviewModal.style.display = "none");
fullPreviewModal.addEventListener("click", (e) => {
  if (e.target === fullPreviewModal) fullPreviewModal.style.display = "none";
});

// ---------- Init ----------
(async () => {
  await loadProducts();
  loadTableCart();

  const printerIpInput = document.getElementById("printerIp");
  const savedPrinterIp = localStorage.getItem("printer_ip");
  if (savedPrinterIp && printerIpInput) printerIpInput.value = savedPrinterIp;
  if (printerIpInput) {
    printerIpInput.addEventListener("change", () => {
      const ip = printerIpInput.value.trim();
      localStorage.setItem("printer_ip", ip);
    });
  }
})();
