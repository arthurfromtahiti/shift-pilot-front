// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  "http://localhost:3000";

export async function loadOrders(status) {
  const url = new URL(`${API_BASE_URL}/orders`);
  url.searchParams.set("active", "true");
  if (status) {
    url.searchParams.set("status", status);
  }

  const response = await fetch(url.toString());
  const orders = await response.json();

  const list = document.getElementById("orders-list");
  list.innerHTML = "";
  if (orders.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = "Aucune commande";
    list.appendChild(empty);
    return;
  }
  for (const order of orders) {
    const item = document.createElement("li");
    item.textContent = `Commande #${order.id} — ${order.totalXpf} XPF (${order.status})`;
    list.appendChild(item);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const select = document.getElementById("status-filter");
    select.addEventListener("change", () => loadOrders(select.value));
    loadOrders();
  });
}
