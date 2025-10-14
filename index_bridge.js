// =================== Papadums POS — Bridge Script ===================
console.log("✅ index_bridge.js loaded");

// Wait for DOM ready
document.addEventListener("DOMContentLoaded", () => {
  const kotBtn = document.getElementById("printKOT");
  const invBtn = document.getElementById("printInv");
  const ipInput = document.getElementById("printerIp");
  const dot = document.getElementById("printerDot");
  const syncStatus = document.getElementById("syncStatus");

  // ---------- 1️⃣ Footer Buttons ----------
  if (kotBtn) {
    kotBtn.addEventListener("click", () => {
      try {
        if (window.printKOT) window.printKOT();
        else window.open("./kot_browser.html", "_blank");
      } catch {
        window.open("./kot_browser.html", "_blank");
      }
    });
  }

  if (invBtn) {
    invBtn.addEventListener("click", () => {
      try {
        if (window.printInvoice) window.printInvoice();
        else window.open("./invoice_browser.html", "_blank");
      } catch {
        window.open("./invoice_browser.html", "_blank");
      }
    });
  }

  // ---------- 2️⃣ Printer IP & Status ----------
  if (localStorage.getItem("printer_ip")) {
    ipInput.value = localStorage.getItem("printer_ip");
  }

  async function checkPrinter() {
    const ip = localStorage.getItem("printer_ip");
    if (!ip) {
      dot.style.background = "gray";
      dot.classList.remove("blinking");
      return;
    }
    dot.style.background = "yellow";
    dot.classList.add("blinking");
    try {
      await fetch(`http://${ip}:9100`, { mode: "no-cors" });
      dot.style.background = "limegreen";
    } catch {
      dot.style.background = "red";
    } finally {
      dot.classList.remove("blinking");
    }
  }

  ipInput.addEventListener("input", () => {
    localStorage.setItem("printer_ip", ipInput.value);
    checkPrinter();
  });

  checkPrinter();
  setInterval(checkPrinter, 10000);

  // ---------- 3️⃣ Sync Status ----------
  function setSyncState(state) {
    if (!syncStatus) return;
    if (state === "syncing") {
      syncStatus.textContent = "🔄 Syncing…";
      syncStatus.style.background = "#FFD54F";
    } else if (state === "offline") {
      syncStatus.textContent = "🔴 Offline";
      syncStatus.style.background = "#E57373";
    } else {
      syncStatus.textContent = "🟢 Online";
      syncStatus.style.background = "#81C784";
    }
  }

  window.addEventListener("online", () => setSyncState("online"));
  window.addEventListener("offline", () => setSyncState("offline"));
  setSyncState(navigator.onLine ? "online" : "offline");

  // ---------- 4️⃣ Service Worker ----------
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("./service-worker.js")
      .then(() => console.log("✅ Service worker registered"))
      .catch((err) => console.warn("❌ SW registration failed", err));
  }
});
