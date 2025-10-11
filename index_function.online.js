// ✅ Papadums POS — Online Function Script (index_function.online.js)
console.log("✅ index_function.online.js loaded (module)");

/* ===== DOM References ===== */
const productSearch = document.getElementById("productSearch");
const qtyInput = document.getElementById("qty");
const addBtn = document.getElementById("addBtn");
const clearBtn = document.getElementById("clearBtn");
const cartList = document.getElementById("cartList");
const totalEl = document.getElementById("total");

/* ===== Load Products ===== */
let products = [];
fetch("./products.json")
  .then(res => res.json())
  .then(data => {
    products = data;
    console.log("📦 Products loaded:", data.length);
  })
  .catch(err => console.error("❌ Failed to load products.json", err));

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

addBtn?.addEventListener("click", () => {
  const name = productSearch.value.trim();
  const qty = parseInt(qtyInput.value || "1");
  const prod = products.find(p => p.name.toLowerCase() === name.toLowerCase());
  if (!prod) return alert("Product not found!");

  const existing = cart.find(i => i.name === prod.name);
  if (existing) existing.qty += qty;
  else cart.push({ ...prod, qty });

  renderCart();
  productSearch.value = "";
  qtyInput.value = 1;
});

clearBtn?.addEventListener("click", () => {
  cart.length = 0;
  renderCart();
});

/* ===== Service Worker Registration ===== */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    console.log("🧩 Service Worker registered:", reg.scope);

    // Force new SW to take control immediately
    if (reg.waiting) {
      reg.waiting.postMessage({ action: "reloadNow" });
    }

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          newWorker.postMessage({ action: "reloadNow" });
        }
      });
    });
  });

  // Reload when controller changes (new SW activated)
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    console.log("🔄 New service worker activated — reloading...");
    window.location.reload(true);
  });

  // Handle reload messages from SW
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.action === "reloadNow") {
      const version = event.data.version || "";
      const toast = document.createElement("div");
      toast.textContent = `🔄 Updating Papadums POS ${version}...`;
      toast.style.cssText = `
        position:fixed; bottom:20px; left:50%; transform:translateX(-50%);
        background:#0b74ff; color:#fff; font-weight:600;
        padding:10px 20px; border-radius:20px;
        box-shadow:0 3px 10px #0003; z-index:9999;
        animation:fadeInOut 2s ease forwards;
      `;
      document.body.appendChild(toast);

      setTimeout(() => window.location.reload(true), 1200);
    }
  });

  // Small fade animation for reload toast
  const style = document.createElement("style");
  style.textContent = `
    @keyframes fadeInOut {
      0% { opacity: 0; transform:translate(-50%, 20px); }
      10%, 90% { opacity: 1; transform:translate(-50%, 0); }
      100% { opacity: 0; transform:translate(-50%, -10px); }
    }
  `;
  document.head.appendChild(style);
}
