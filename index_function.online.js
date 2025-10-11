// ✅ Papadums POS — Online Function Script (index_function.online.js)
// Clean version — No Service Worker + Sync Indicator
console.log("✅ index_function.online.js loaded (module)");

/* ===== DOM References ===== */
const productSearch = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const cartList = document.getElementById("cartList");
const totalEl = document.getElementById("total");

/* ===== Sync Indicator ===== */
const syncIndicator = document.createElement("div");
syncIndicator.id = "syncIndicator";
syncIndicator.textContent = navigator.onLine ? "🟢 Online" : "🔴 Offline";
syncIndicator.style.cssText = `
  position: fixed;
  top: 8px;
  right: 8px;
  background: ${navigator.onLine ? "#00c853" : "#d50000"};
  color: white;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  box-shadow: 0 2px 6px #0002;
  z-index: 9999;
  transition: background 0.3s ease, color 0.3s ease;
`;
document.body.appendChild(syncIndicator);

window.addEventListener("online", () => {
  syncIndicator.textContent = "🟢 Online";
  syncIndicator.style.background = "#00c853";
});

window.addEventListener("offline", () => {
  syncIndicator.textContent = "🔴 Offline";
  syncIndicator.style.background = "#d50000";
});

/* ===== Load Products ===== */
let products = [];

fetch("./products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    console.log("📦 Products loaded:", data.length);
  })
  .catch(err => {
    console.error("❌ Failed to load products.json", err);
    const msg = document.createElement("div");
    msg.textContent = "⚠️ Unable to load products. Check connection or JSON file.";
    msg.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff5252;
      color: white;
      padding: 8px 16px;
      border-radius: 8px;
      font-weight: 600;
      z-index: 9999;
    `;
    document.body.appendChild(msg);
  });

/* ===== Cart Logic ===== */
const cart = [];

function renderCart() {
  if (!cartList || !totalEl) return;
  cartList.innerHTML = "";
  let total = 0;

  cart.forEach(item => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">
        <span>${item.name} x${item.qty}</span>
        <strong>${(item.price * item.qty).toFixed(0)}₫</strong>
      </div>`;
    cartList.appendChild(li);
    total += item.price * item.qty;
  });

  totalEl.textContent = total.toFixed(0) + "₫";
}

/* ===== Add Product ===== */
addBtn?.addEventListener("click", () => {
  const name = productSearch.value.trim();
  const qty = parseInt(qtyInput.value || "1");
  const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());

  if (!prod) {
    alert("Product not found!");
    return;
  }

  const existing = cart.find(i => i.name === prod.name);
  if (existing) existing.qty += qty;
  else cart.push({ ...prod, qty });

  renderCart();
  productSearch.value = "";
  qtyInput.value = 1;
});

/* ===== Clear Cart ===== */
clearBtn?.addEventListener("click", () => {
  cart.length = 0;
  renderCart();
});

/* ===== Disable Old Service Worker (Cleanup) ===== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    for (let reg of regs) {
      reg.unregister().then(() => console.log("🗑️ Old service worker removed:", reg.scope));
    }
  });
                         }
