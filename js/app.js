// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL = window.API_BASE_URL || "http://localhost:3000";

async function loadOrders(status) {
  const url = new URL(`${API_BASE_URL}/orders`);
  if (status) {
    url.searchParams.set("status", status);
  }

  const response = await fetch(url.toString());
  const orders = await response.json();

  const list = document.getElementById("orders-list");
  list.innerHTML = "";
  for (const order of orders) {
    const item = document.createElement("li");
    item.textContent = `Commande #${order.id} — ${order.total / 100} XPF (${order.status})`;
    list.appendChild(item);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("status-filter");
  select.addEventListener("change", () => loadOrders(select.value));
  loadOrders();
});
