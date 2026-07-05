import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// One-time client self-heal: unregister any legacy service workers and purge
// CacheStorage so browsers that cached an old deployment load current code.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((regs) => regs.forEach((reg) => reg.unregister()))
    .catch(() => {});
}
if ("caches" in window) {
  caches
    .keys()
    .then((keys) => keys.forEach((k) => caches.delete(k)))
    .catch(() => {});
}

createRoot(document.getElementById("root")!).render(<App />);
