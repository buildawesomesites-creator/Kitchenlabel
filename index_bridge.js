// =================== POS Bridge Fix Script ===================
console.log("✅ index_bridge.js loaded (Bridge active)");

// Wait until DOM and other scripts are ready
document.addEventListener("DOMContentLoaded", () => {

  // ========== ELEMENTS ==========
  const addBtn = document.getElementById("addBtn");
  const clearBtn = document.getElementById("clearBtn");
  const previewModal = document.getElementById("fullPreview");
  const closePreview = document.getElementById("closePreview");
  const previewBody = document.getElementById("fullPreviewContent");
  const printKOT = document.getElementById("printKOT");
  const printInvoice = document.getElementById("printInvoice");

  // Load or create cart
  let cart = JSON.parse(localStorage.getItem("pos_cart") || "[]");

  // ========== ADD ITEM ==========
  addBtn?.addEventListener("click", () => {
    try {
      const name = document.getElementById("productSearch").value.trim();
      const qty = parseInt(document.getElementById("qty").value) || 1;

      if (!name) return alert("Please select a product first!");

      // Read from product cache (unchanged)
      const products = JSON.parse(localStorage.getItem("products_cache") || "[]");
      const found = products.find(p => p.name === name);
      if (!found) return alert("Product not found!");

      // Add or update
      const existing = cart.find(i => i.name === name);
      if (existing) existing.qty += qty;
      else cart.push({ name, price: found.price, qty });

      localStorage.setItem("pos_cart", JSON.stringify(cart));
      document.getElementById("productSearch").value = "";
      document.getElementById("qty").value = 1;
      console.log("🛒 Cart updated:", cart);

      alert("✅ Item added to order");
    } catch (err) {
      console.error("Add item error:", err);
    }
  });

  // ========== CLEAR ITEMS ==========
  clearBtn?.addEventListener("click", () => {
    if (!confirm("Clear all items from this order?")) return;
    cart = [];
    localStorage.setItem("pos_cart", "[]");
    console.log("🧹 Cart cleared");
    alert("🧹 All items cleared");
  });

  // ========== ORDER PREVIEW ==========
  const orderPreview = document.getElementById("orderPreview");
  orderPreview?.addEventListener("click", () => {
    cart = JSON.parse(localStorage.getItem("pos_cart") || "[]");
    if (cart.length === 0) {
      alert("No items in order!");
      return;
    }

    let html = `
      <h3 style="text-align:center;margin-bottom:10px;">ORDER PREVIEW</h3>
      <div style="padding:6px 12px;">${cart.map(
        i => `<div style="display:flex;justify-content:space-between;border-bottom:1px solid #ddd;padding:4px 0;">
          <span>${i.name}</span>
          <span>x${i.qty}</span>
          <span>${(i.qty * i.price).toLocaleString()}₫</span>
        </div>`
      ).join("")}</div>
      <div style="text-align:right;font-weight:bold;padding:8px 12px;">
        Total: ${(cart.reduce((s,i)=>s+i.price*i.qty,0)).toLocaleString()}₫
      </div>
    `;
    previewBody.innerHTML = html;
    previewModal.style.display = "flex";
  });

  closePreview?.addEventListener("click", () => {
    previewModal.style.display = "none";
  });

  // ========== PRINT KOT ==========
  printKOT?.addEventListener("click", () => {
    localStorage.setItem("kot_data", localStorage.getItem("pos_cart"));
    window.open("kot_browser.html", "_blank");
  });

  // ========== PRINT INVOICE ==========
  printInvoice?.addEventListener("click", () => {
    localStorage.setItem("invoice_data", localStorage.getItem("pos_cart"));
    window.open("invoice_browser.html", "_blank");
  });

});
