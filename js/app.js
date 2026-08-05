// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  "http://localhost:3000";

const CURRENT_USER_ID =
  (typeof window !== "undefined" && window.CURRENT_USER_ID) || null;

function formatDate(isoString) {
  if (!isoString) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
}

async function cancelOrder(orderId, currentUserId) {
  const response = await fetch(`${API_BASE_URL}/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { "X-User-Id": String(currentUserId) },
  });
  if (response.status === 200) {
    return await response.json();
  }
  if (response.status === 401) throw new Error("Non autorisé");
  if (response.status === 403) throw new Error("Cette commande ne vous appartient pas");
  if (response.status === 409) throw new Error("Cette commande ne peut plus être annulée");
  throw new Error("Erreur inconnue");
}

async function loadOrders(status, sort, from, to, currentUserId) {
  const url = new URL(`${API_BASE_URL}/orders`);
  url.searchParams.set("active", "true");
  if (status) url.searchParams.set("status", status);
  if (sort) url.searchParams.set("sort", sort);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);

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
    const date = formatDate(order.createdAt);
    const datePart = date ? ` — ${date}` : "";
    const currency = order.currency;

    const textSpan = document.createElement("span");
    textSpan.textContent = `Commande #${order.id} — ${order.total} ${currency} (${order.status})${datePart}`;
    item.appendChild(textSpan);

    if (order.status === "paid" && currentUserId != null && order.userId === currentUserId) {
      const btn = document.createElement("button");
      btn.textContent = "Annuler";
      btn.addEventListener("click", async () => {
        try {
          await cancelOrder(order.id, currentUserId);
          textSpan.textContent = `Commande #${order.id} — ${order.total} ${currency} (cancelled_by_client)${datePart}`;
          btn.remove();
        } catch (err) {
          item.querySelectorAll("[data-error]").forEach((el) => el.remove());
          const errorSpan = document.createElement("span");
          errorSpan.setAttribute("data-error", "true");
          errorSpan.textContent = ` — ${err.message}`;
          item.appendChild(errorSpan);
        }
      });
      item.appendChild(btn);
    }

    list.appendChild(item);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const statusSelect = document.getElementById("status-filter");

    const sortLabel = document.createElement("label");
    sortLabel.htmlFor = "sort-filter";
    sortLabel.textContent = "Tri : ";

    const sortSelect = document.createElement("select");
    sortSelect.id = "sort-filter";
    for (const [value, text] of [
      ["", "Date (défaut)"],
      ["date_asc", "Date croissante"],
      ["date_desc", "Date décroissante"],
    ]) {
      const opt = document.createElement("option");
      opt.value = value;
      opt.textContent = text;
      sortSelect.appendChild(opt);
    }

    const fromLabel = document.createElement("label");
    fromLabel.htmlFor = "from-filter";
    fromLabel.textContent = " Du : ";

    const fromInput = document.createElement("input");
    fromInput.type = "date";
    fromInput.id = "from-filter";

    const toLabel = document.createElement("label");
    toLabel.htmlFor = "to-filter";
    toLabel.textContent = " Au : ";

    const toInput = document.createElement("input");
    toInput.type = "date";
    toInput.id = "to-filter";

    const list = document.getElementById("orders-list");
    list.before(sortLabel, sortSelect, fromLabel, fromInput, toLabel, toInput);

    const reload = () =>
      loadOrders(statusSelect.value, sortSelect.value, fromInput.value, toInput.value, CURRENT_USER_ID);

    statusSelect.addEventListener("change", reload);
    sortSelect.addEventListener("change", reload);
    fromInput.addEventListener("change", reload);
    toInput.addEventListener("change", reload);

    reload();
  });
}

// Chargé à la fois comme module natif par index.html (<script type="module">, pas de "module" global)
// et via require() par les tests Jest (CommonJS) — d'où l'export gardé plutôt qu'un mot-clé "export".
if (typeof module !== "undefined") {
  module.exports = { loadOrders, cancelOrder };
}
