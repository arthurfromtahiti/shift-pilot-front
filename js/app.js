// Front minimal jouet — consomme l'API de shift-pilot-back.
// Configurable via window.API_BASE_URL (défaut : localhost, à ajuster selon l'environnement).

const API_BASE_URL =
  (typeof window !== "undefined" && window.API_BASE_URL) ||
  "http://localhost:3000";

const LIMIT = 20;
let lastKnownTotalPages = 1;

function formatDate(isoString) {
  if (!isoString) return null;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(isoString));
}

async function loadOrderHistory(orderId) {
  try {
    const response = await fetch(`${API_BASE_URL}/orders/${orderId}/history`);
    if (!response.ok) {
      return { error: true };
    }
    return await response.json();
  } catch (_) {
    return { error: true };
  }
}

async function loadOrders(status, sort, from, to, customerName, page = 1) {
  const url = new URL(`${API_BASE_URL}/orders`);
  if (status) url.searchParams.set("status", status);
  if (sort) url.searchParams.set("sort", sort);
  if (from) url.searchParams.set("from", from);
  if (to) url.searchParams.set("to", to);
  if (customerName) url.searchParams.set("customerName", customerName);
  url.searchParams.set("page", String(page));
  url.searchParams.set("limit", String(LIMIT));

  const list = document.getElementById("orders-list");
  list.innerHTML = "";

  let data;
  try {
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errEl = document.createElement("li");
      errEl.textContent = "Erreur lors du chargement des commandes";
      list.appendChild(errEl);
      return;
    }
    data = await response.json();
  } catch (_) {
    const errEl = document.createElement("li");
    errEl.textContent = "Erreur lors du chargement des commandes";
    list.appendChild(errEl);
    return;
  }

  const orders = data.orders;
  const pagination = data.pagination;

  if (!orders || orders.length === 0) {
    const empty = document.createElement("li");
    empty.textContent = customerName ? "Aucune commande trouvée" : "Aucune commande";
    list.appendChild(empty);
  } else {
    for (const order of orders) {
      const item = document.createElement("li");
      const date = formatDate(order.createdAt);
      const datePart = date ? ` — ${date}` : "";
      item.textContent = `Commande #${order.id} — ${order.total} ${order.currency} (${order.status})${datePart}`;

      const histBtn = document.createElement("button");
      histBtn.textContent = "Historique";
      histBtn.className = "btn-historique";

      const histPanel = document.createElement("ul");
      histPanel.className = "order-history";
      histPanel.style.display = "none";

      let historyLoaded = false;

      histBtn.addEventListener("click", async () => {
        if (histPanel.style.display !== "none") {
          histPanel.style.display = "none";
          return;
        }
        if (!historyLoaded) {
          const result = await loadOrderHistory(order.id);
          histPanel.innerHTML = "";
          if (result.error) {
            const errEl = document.createElement("li");
            errEl.textContent = "Historique indisponible";
            histPanel.appendChild(errEl);
          } else {
            historyLoaded = true;
            for (const entry of result.history) {
              const entryEl = document.createElement("li");
              entryEl.textContent = `${entry.status} — ${entry.at}`;
              histPanel.appendChild(entryEl);
            }
          }
        }
        histPanel.style.display = "";
      });

      item.appendChild(histBtn);
      item.appendChild(histPanel);
      list.appendChild(item);
    }
  }

  const prevBtn = document.getElementById("pagination-prev");
  const nextBtn = document.getElementById("pagination-next");
  const pageInfo = document.getElementById("pagination-info");
  if (prevBtn && nextBtn && pageInfo && pagination) {
    lastKnownTotalPages = pagination.totalPages;
    prevBtn.disabled = pagination.page <= 1;
    nextBtn.disabled = pagination.page >= pagination.totalPages;
    pageInfo.textContent = `Page ${pagination.page} / ${pagination.totalPages}`;
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    const statusSelect = document.getElementById("status-filter");
    let currentPage = 1;

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
      ["client_asc", "Client A → Z"],
      ["client_desc", "Client Z → A"],
      ["status_asc", "Statut A → Z"],
      ["status_desc", "Statut Z → A"],
      ["total_asc", "Total croissant"],
      ["total_desc", "Total décroissant"],
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

    const prevBtn = document.createElement("button");
    prevBtn.id = "pagination-prev";
    prevBtn.textContent = "Précédent";
    prevBtn.disabled = true;

    const pageInfo = document.createElement("span");
    pageInfo.id = "pagination-info";

    const nextBtn = document.createElement("button");
    nextBtn.id = "pagination-next";
    nextBtn.textContent = "Suivant";

    list.after(prevBtn, pageInfo, nextBtn);

    const reload = () => {
      currentPage = 1;
      loadOrders(statusSelect.value, sortSelect.value, fromInput.value, toInput.value, customerNameInput.value, currentPage);
    };

    prevBtn.addEventListener("click", () => {
      if (currentPage > 1) {
        currentPage--;
        loadOrders(statusSelect.value, sortSelect.value, fromInput.value, toInput.value, customerNameInput.value, currentPage);
      }
    });

    nextBtn.addEventListener("click", () => {
      if (currentPage < lastKnownTotalPages) {
        currentPage++;
        loadOrders(statusSelect.value, sortSelect.value, fromInput.value, toInput.value, customerNameInput.value, currentPage);
      }
    });

    statusSelect.addEventListener("change", reload);
    sortSelect.addEventListener("change", reload);
    fromInput.addEventListener("change", reload);
    toInput.addEventListener("change", reload);

    let debounceTimer;
    customerNameInput.addEventListener("input", () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(reload, 300);
    });

    loadOrders(undefined, undefined, undefined, undefined, undefined, currentPage);
  });
}

// Chargé à la fois comme module natif par index.html (<script type="module">, pas de "module" global)
// et via require() par les tests Jest (CommonJS) — d'où l'export gardé plutôt qu'un mot-clé "export".
if (typeof module !== "undefined") {
  module.exports = { loadOrders, loadOrderHistory };
}
