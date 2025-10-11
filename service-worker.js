<script>
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const reg = await navigator.serviceWorker.register("/Kitchenlabel/service-worker.js", {
          scope: "/Kitchenlabel/"
        });
        console.log("✅ Service Worker registered:", reg.scope);

        // Auto update listener
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              console.log("⚡ New version available, refreshing...");
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
      } catch (err) {
        console.warn("❌ SW registration failed:", err);
      }
    });
  }
</script>
