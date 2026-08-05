// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  "http://localhost:3000";

function formatDate(isoString) {
  if (!isoString) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
}

async function loadOrders(status, sort, from, to, customerName) {
  const url = new URL(`${API_BASE_URL}/orders`);
  url.searchParams.set("active", "true");
  if (status) url.searchParams.set("status", status);
  if (sort) url.searchParams.set("sort", sort);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (customerName) url.searchParams.set("customerName", customerName);

  const response = await fetch(url.toString());
  const orders = await response.json();

  const list = document.getElementById("orders-list");
  list.innerHTML = "";
  if (orders.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = customerName ? "Aucune commande trouvée" : "Aucune commande";
    list.appendChild(empty);
    return;
  }
  for (const order of orders) {
    const item = document.createElement("li");
    const date = formatDate(order.createdAt);
    const datePart = date ? ` — ${date}` : "";
    item.textContent = `Commande #${order.id} — ${order.total} ${order.currency} (${order.status})${datePart}`;
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
      ["amount_asc", "Montant croissant"],
      ["amount_desc", "Montant décroissant"],
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

    const customerNameLabel = document.createElement("label");
    customerNameLabel.htmlFor = "customer-name-filter";
    customerNameLabel.textContent = " Client : ";

    const customerNameInput = document.createElement("input");
    customerNameInput.type = "text";
    customerNameInput.id = "customer-name-filter";
    customerNameInput.placeholder = "Nom du client";

    const list = document.getElementById("orders-list");
    list.before(sortLabel, sortSelect, fromLabel, fromInput, toLabel, toInput, customerNameLabel, customerNameInput);

    const reload = () =>
      loadOrders(statusSelect.value, sortSelect.value, fromInput.value, toInput.value, customerNameInput.value);

    statusSelect.addEventListener("change", reload);
    sortSelect.addEventListener("change", reload);
    fromInput.addEventListener("change", reload);
    toInput.addEventListener("change", reload);

    let debounceTimer;
    customerNameInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(reload, 300);
    });

    loadOrders();
  });
}

// Chargé à la fois comme module natif par index.html (<script type="module">, pas de "module" global)
// et via require() par les tests Jest (CommonJS) — d'où l'export gardé plutôt qu'un mot-clé "export".
if (typeof module !== "undefined") {
  module.exports = { loadOrders };
}
