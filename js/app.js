// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL = window.API_BASE_URL || "http://localhost:3000";

async function loadActiveOrders() {
  const response = await fetch(`${API_BASE_URL}/orders?active=true`);
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
    item.textContent = `Commande #${order.id} — ${order.total / 100} XPF (${order.status})`;
    list.appendChild(item);
  }
}

document.addEventListener("DOMContentLoaded", loadActiveOrders);

if (typeof module !== "undefined") module.exports = { loadActiveOrders };
