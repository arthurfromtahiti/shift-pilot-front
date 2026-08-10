/**
 * Tests d'acceptation — CLA-121, CLA-95, CLA-195, CLA-227, SHIAAAAAAAAAAAAAAAAAAAAAAAA-250, SHIAAAAAAAAAAAAAAAAAAAAAAAA-343, SHIAAAAAAAAAAAAAAAAAAAAAAAA-374
 * État vide : afficher "Aucune commande" quand la liste est vide
 */

const fs = require("fs");
const path = require("path");
const { loadOrders, loadOrderHistory, exportOrders, searchOrderById } = require("./app.js");

const paginatedResponse = (orders, page = 1, totalPages = 1) => ({
  orders,
  pagination: { total: orders.length, page, limit: 20, totalPages },
});

describe("loadOrders", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("liste vide → affiche « Aucune commande » dans #orders-list", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.textContent).toBe("Aucune commande");
    expect(list.children.length).toBe(1);
    expect(list.children[0].tagName).toBe("LI");
  });

  test("liste non vide → une ligne par commande, pas de message vide", async () => {
    const orders = [
      { id: 1, total: 25, status: "pending", currency: "XPF" },
      { id: 2, total: 50, status: "ready", currency: "XPF" },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(2);
    expect(list.children[0].textContent).toContain("Commande #1 — 25 XPF (pending)");
    expect(list.children[1].textContent).toContain("Commande #2 — 50 XPF (ready)");
    expect(list.textContent).not.toContain("Aucune commande");
  });

  test("affiche order.total directement sans transformation", async () => {
    // Le back stocke et expose total déjà en XPF, sans champ totalXpf dérivé — CLA-195
    const orders = [{ id: 42, total: 1500, status: "pending", currency: "XPF" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toContain("Commande #42 — 1500 XPF (pending)");
  });

  test("appel réseau par défaut (Tous) n'envoie pas active et n'envoie pas status — SHIAAAAAAAAAAAAAAAAAAAAAAAA-358", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("active")).toBe(false);
    expect(url.searchParams.has("status")).toBe(false);
  });

  test("appel réseau avec status envoie status sans active — CLA-95", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders("paid");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("active")).toBe(false);
    expect(url.searchParams.get("status")).toBe("paid");
  });

  test("index.html : le sélecteur de statut respecte le contrat back (paid/cancelled, pas pending/in_progress/delivered) — CLA-95", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
    expect(html).toContain('id="status-filter"');
    expect(html).toContain('value="paid"');
    expect(html).toContain('value="cancelled"');
    expect(html).not.toContain('value="pending"');
    expect(html).not.toContain('value="in_progress"');
    expect(html).not.toContain('value="delivered"');
  });
});

describe("loadOrders — CLA-262 affichage devise", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("affiche order.currency à côté du montant — CLA-262", async () => {
    const orders = [{ id: 1, total: 42, status: "paid", currency: "EUR" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toContain("Commande #1 — 42 EUR (paid)");
  });

  test("affiche XPF quand currency vaut XPF — CLA-262", async () => {
    const orders = [{ id: 7, total: 500, status: "paid", currency: "XPF" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toContain("Commande #7 — 500 XPF (paid)");
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-24 recherche par nom de client", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("customerName envoie ?customerName=<valeur> dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, undefined, undefined, undefined, "Dupont");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("customerName")).toBe("Dupont");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("customerName vide → pas de paramètre customerName dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("customerName")).toBe(false);
  });

  test("customerName avec résultat vide → affiche « Aucune commande trouvée »", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, undefined, undefined, undefined, "Dupont");

    const list = document.getElementById("orders-list");
    expect(list.textContent).toBe("Aucune commande trouvée");
    expect(list.children.length).toBe(1);
    expect(list.children[0].tagName).toBe("LI");
  });

  test("sans customerName et liste vide → affiche toujours « Aucune commande »", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.textContent).toBe("Aucune commande");
  });

  test("customerName se combine avec status, sort, from, to", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders("paid", "date_desc", "2024-01-01", "2024-12-31", "Jean");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("active")).toBe(false);
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("sort")).toBe("date_desc");
    expect(url.searchParams.get("from")).toBe("2024-01-01");
    expect(url.searchParams.get("to")).toBe("2024-12-31");
    expect(url.searchParams.get("customerName")).toBe("Jean");
  });

  test("customerName avec résultats affiche les commandes filtrées", async () => {
    const orders = [
      { id: 101, userId: 2, total: 42, status: "paid", createdAt: "2024-01-10T08:00:00Z", clientName: "Jean Dupont", currency: "XPF" },
    ];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders(undefined, undefined, undefined, undefined, "Dupont");

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(1);
    expect(list.children[0].textContent).toContain("Commande #101");
    expect(list.children[0].textContent).toContain("42 XPF");
    expect(list.textContent).not.toContain("Aucune commande");
  });
});

describe("loadOrders — CLA-227 affichage date et tri/filtre", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("affiche createdAt formatté quand présent dans la commande", async () => {
    const orders = [{ id: 1, total: 100, status: "paid", currency: "XPF", createdAt: "2024-01-10T08:00:00Z" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const text = list.children[0].textContent;
    expect(text).toContain("Commande #1");
    expect(text).toContain("100 XPF");
    expect(text).toContain("2024");
  });

  test("n'affiche pas de date si createdAt absent — rétrocompatibilité", async () => {
    const orders = [{ id: 1, total: 100, status: "paid", currency: "XPF" }];
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse(orders)),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toContain("Commande #1 — 100 XPF (paid)");
  });

  test("sort=date_asc ajoute ?sort=date_asc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "date_asc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("date_asc");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("sort=date_desc ajoute ?sort=date_desc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "date_desc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("date_desc");
  });

  test("from et to ajoutent les paramètres de plage de dates", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, undefined, "2024-02-01", "2024-03-31");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.get("to")).toBe("2024-03-31");
  });

  test("tous les paramètres se combinent (status + sort + from + to)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders("paid", "date_desc", "2024-02-01", "2024-03-31");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("active")).toBe(false);
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("sort")).toBe("date_desc");
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.get("to")).toBe("2024-03-31");
  });

  test("from seul sans to → seul from dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, undefined, "2024-02-01", undefined);

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.has("to")).toBe(false);
  });

  test("sort=amount_asc ajoute ?sort=amount_asc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "amount_asc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("amount_asc");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("sort=amount_desc ajoute ?sort=amount_desc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "amount_desc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("amount_desc");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("sort=total_asc ajoute ?sort=total_asc à la requête — SHIAAAAAAAAAAAAAAAAAAAAAAAA-463", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "total_asc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("total_asc");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("sort=total_desc ajoute ?sort=total_desc à la requête — SHIAAAAAAAAAAAAAAAAAAAAAAAA-463", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders(undefined, "total_desc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("total_desc");
    expect(url.searchParams.has("active")).toBe(false);
  });

  test("sans sort → pas de param sort dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("sort")).toBe(false);
  });

  test("sans from ni to → pas de paramètres de plage dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([])),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
  });
});

describe("nextBtn — garde locale SHIAAAAAAAAAAAAAAAAAAAAAAAA-299", () => {
  beforeEach(async () => {
    document.body.innerHTML = `
      <select id="status-filter"><option value="">Tous</option></select>
      <ul id="orders-list"></ul>
    `;

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        orders: [],
        pagination: { total: 40, page: 1, limit: 20, totalPages: 2 },
      }),
    });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("des clics rapides sur Suivant n'envoient pas de requête avec page > totalPages", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        orders: [],
        pagination: { total: 40, page: 2, limit: 20, totalPages: 2 },
      }),
    });

    const nextBtn = document.getElementById("pagination-next");
    expect(nextBtn).toBeTruthy();

    nextBtn.click();
    nextBtn.click();
    nextBtn.click();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-250 pagination", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="orders-list"></ul>
      <button id="pagination-prev" disabled>Précédent</button>
      <span id="pagination-info"></span>
      <button id="pagination-next">Suivant</button>
    `;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("envoie page=1 et limit=20 par défaut", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("limit")).toBe("20");
  });

  test("envoie le numéro de page passé en paramètre", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 2, limit: 20, totalPages: 2 } }),
    });

    await loadOrders(undefined, undefined, undefined, undefined, undefined, 2);

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("page")).toBe("2");
  });

  test("lit les commandes depuis response.orders", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        orders: [{ id: 5, total: 100, status: "paid", currency: "XPF" }],
        pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
      }),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toContain("Commande #5 — 100 XPF (paid)");
  });

  test("bouton Précédent désactivé à la page 1", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 1, limit: 20, totalPages: 2 } }),
    });

    await loadOrders();

    expect(document.getElementById("pagination-prev").disabled).toBe(true);
  });

  test("bouton Suivant désactivé à la dernière page", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 2, limit: 20, totalPages: 2 } }),
    });

    await loadOrders(undefined, undefined, undefined, undefined, undefined, 2);

    expect(document.getElementById("pagination-next").disabled).toBe(true);
  });

  test("bouton Précédent activé quand page > 1", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 2, limit: 20, totalPages: 2 } }),
    });

    await loadOrders(undefined, undefined, undefined, undefined, undefined, 2);

    expect(document.getElementById("pagination-prev").disabled).toBe(false);
  });

  test("bouton Suivant activé quand page < totalPages", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 1, limit: 20, totalPages: 2 } }),
    });

    await loadOrders();

    expect(document.getElementById("pagination-next").disabled).toBe(false);
  });

  test("info de pagination affiche la page courante et le total", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 40, page: 2, limit: 20, totalPages: 2 } }),
    });

    await loadOrders(undefined, undefined, undefined, undefined, undefined, 2);

    expect(document.getElementById("pagination-info").textContent).toBe("Page 2 / 2");
  });

  test("les filtres existants sont transmis avec les paramètres de pagination", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ orders: [], pagination: { total: 0, page: 2, limit: 20, totalPages: 0 } }),
    });

    await loadOrders("paid", "date_desc", "2024-01-01", "2024-12-31", "Jean", 2);

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("sort")).toBe("date_desc");
    expect(url.searchParams.get("from")).toBe("2024-01-01");
    expect(url.searchParams.get("to")).toBe("2024-12-31");
    expect(url.searchParams.get("customerName")).toBe("Jean");
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-343 bouton Historique", () => {
  const historyResponse = {
    orderId: 7,
    history: [
      { status: "pending", at: "2024-01-01T10:00:00Z" },
      { status: "paid", at: "2024-01-02T10:00:00Z" },
    ],
  };

  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("chaque ligne de commande a un bouton Historique", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(paginatedResponse([
        { id: 7, total: 200, status: "paid", currency: "XPF" },
      ])),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Historique");
  });

  test("premier clic appelle GET /orders/:id/history et affiche les entrées status — at", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = list.querySelector("ul.order-history");
    expect(panel.style.display).not.toBe("none");
    expect(panel.children.length).toBe(2);
    expect(panel.children[0].textContent).toBe("pending — 2024-01-01T10:00:00Z");
    expect(panel.children[1].textContent).toBe("paid — 2024-01-02T10:00:00Z");

    const histUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(histUrl.pathname).toBe("/orders/7/history");
  });

  test("second clic masque le panneau sans appel réseau supplémentaire", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    const panel = list.querySelector("ul.order-history");

    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.style.display).not.toBe("none");

    const callsBefore = global.fetch.mock.calls.length;
    btn.click();
    expect(panel.style.display).toBe("none");
    expect(global.fetch.mock.calls.length).toBe(callsBefore);
  });

  test("troisième clic ré-affiche le panneau sans appel réseau supplémentaire", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    const panel = list.querySelector("ul.order-history");

    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const callsBefore = global.fetch.mock.calls.length;
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.style.display).not.toBe("none");
    expect(global.fetch.mock.calls.length).toBe(callsBefore);
  });

  test("erreur 404 → affiche « Historique indisponible »", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 99, total: 50, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: jest.fn().mockResolvedValue({ error: "Not found" }),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = list.querySelector("ul.order-history");
    expect(panel.style.display).not.toBe("none");
    expect(panel.textContent).toBe("Historique indisponible");
  });

  test("erreur réseau → affiche « Historique indisponible »", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 99, total: 50, status: "paid", currency: "XPF" },
        ])),
      })
      .mockRejectedValueOnce(new Error("Network error"));

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const panel = list.querySelector("ul.order-history");
    expect(panel.style.display).not.toBe("none");
    expect(panel.textContent).toBe("Historique indisponible");
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-374 historyLoaded ne se sette qu'en cas de succès", () => {
  const historyResponse = {
    orderId: 7,
    history: [
      { status: "pending", at: "2024-01-01T10:00:00Z" },
      { status: "paid", at: "2024-01-02T10:00:00Z" },
    ],
  };

  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("après un échec HTTP, la réouverture du panneau effectue une nouvelle tentative réseau", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: jest.fn().mockResolvedValue({ error: "Internal Server Error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    const panel = list.querySelector("ul.order-history");

    // Clic 1 : erreur → panneau affiché avec message d'erreur
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.textContent).toBe("Historique indisponible");

    // Clic 2 : cache le panneau
    btn.click();
    expect(panel.style.display).toBe("none");

    const callsBeforeRetry = global.fetch.mock.calls.length;

    // Clic 3 : réouverture → historyLoaded est false → nouvelle tentative réseau
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(global.fetch.mock.calls.length).toBe(callsBeforeRetry + 1);
    expect(panel.children.length).toBe(2);
  });

  test("après un échec réseau, la réouverture du panneau effectue une nouvelle tentative réseau", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    const panel = list.querySelector("ul.order-history");

    // Clic 1 : erreur réseau → panneau affiché avec message d'erreur
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.textContent).toBe("Historique indisponible");

    // Clic 2 : cache le panneau
    btn.click();
    expect(panel.style.display).toBe("none");

    const callsBeforeRetry = global.fetch.mock.calls.length;

    // Clic 3 : réouverture → historyLoaded est false → nouvelle tentative réseau
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(global.fetch.mock.calls.length).toBe(callsBeforeRetry + 1);
    expect(panel.children.length).toBe(2);
  });

  test("après un succès, la réouverture du panneau ne refait pas d'appel réseau", async () => {
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([
          { id: 7, total: 200, status: "paid", currency: "XPF" },
        ])),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(historyResponse),
      });

    await loadOrders();

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button.btn-historique");
    const panel = list.querySelector("ul.order-history");

    // Clic 1 : succès → historyLoaded passe true
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(panel.children.length).toBe(2);

    const callsAfterSuccess = global.fetch.mock.calls.length;

    // Clic 2 : cache le panneau
    btn.click();
    expect(panel.style.display).toBe("none");

    // Clic 3 : réouverture → historyLoaded est true → pas d'appel réseau
    btn.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(global.fetch.mock.calls.length).toBe(callsAfterSuccess);
    expect(panel.style.display).not.toBe("none");
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-367 gestion des erreurs réseau", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("erreur réseau (fetch reject) → affiche « Erreur lors du chargement des commandes »", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(1);
    expect(list.children[0].textContent).toBe("Erreur lors du chargement des commandes");
  });

  test("réponse HTTP non-OK (500) → affiche « Erreur lors du chargement des commandes »", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(1);
    expect(list.children[0].textContent).toBe("Erreur lors du chargement des commandes");
  });
});

describe("loadOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-387 garde sur data.orders absent", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("data.orders absent → ne lève pas d'exception et affiche un message neutre", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });

    await expect(loadOrders()).resolves.toBeUndefined();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(1);
    expect(list.children[0].textContent).toBe("Aucune commande");
  });
});

describe("exportOrders — SHIAAAAAAAAAAAAAAAAAAAAAAAA-487", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <button id="export-csv-btn">Exporter en CSV</button>
      <span id="export-csv-message"></span>
      <ul id="orders-list"></ul>
    `;
    global.URL.createObjectURL = jest.fn().mockReturnValue("blob:mock");
    global.URL.revokeObjectURL = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete global.URL.createObjectURL;
    delete global.URL.revokeObjectURL;
  });

  test("#export-csv-btn et #export-csv-message sont présents dans index.html", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
    expect(html).toContain('id="export-csv-btn"');
    expect(html).toContain('id="export-csv-message"');
  });

  test("appelle /orders/export.csv avec les filtres actifs", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name) => (name === "X-Total-Count" ? "5" : null) },
      blob: jest.fn().mockResolvedValue(new Blob(["csv"])),
    });

    await exportOrders("paid", "date_desc", "2024-01-01", "2024-12-31", "Dupont");

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/orders/export.csv");
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("sort")).toBe("date_desc");
    expect(url.searchParams.get("from")).toBe("2024-01-01");
    expect(url.searchParams.get("to")).toBe("2024-12-31");
    expect(url.searchParams.get("customerName")).toBe("Dupont");
  });

  test("sans filtres, aucun paramètre de filtre n'est envoyé", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      blob: jest.fn().mockResolvedValue(new Blob()),
    });

    await exportOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.pathname).toContain("/orders/export.csv");
    expect(url.searchParams.has("status")).toBe(false);
    expect(url.searchParams.has("sort")).toBe(false);
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
    expect(url.searchParams.has("customerName")).toBe(false);
  });

  test("lit X-Total-Count et affiche 'N commandes exportées' dans #export-csv-message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: (name) => (name === "X-Total-Count" ? "42" : null) },
      blob: jest.fn().mockResolvedValue(new Blob(["csv"])),
    });

    await exportOrders();

    expect(document.getElementById("export-csv-message").textContent).toBe("42 commandes exportées");
  });

  test("déclenche le téléchargement : href, download et click() sont corrects sur l'ancre", async () => {
    const fakeBlob = new Blob(["id,total\n1,100"]);
    let capturedAnchor = null;
    const origCreateElement = document.createElement.bind(document);
    jest.spyOn(document, "createElement").mockImplementation((tag) => {
      const el = origCreateElement(tag);
      if (tag === "a") {
        capturedAnchor = el;
        jest.spyOn(el, "click");
      }
      return el;
    });

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      blob: jest.fn().mockResolvedValue(fakeBlob),
    });

    await exportOrders();

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(fakeBlob);
    expect(capturedAnchor).not.toBeNull();
    expect(capturedAnchor.getAttribute("href")).toBe("blob:mock");
    expect(capturedAnchor.download).toBeTruthy();
    expect(capturedAnchor.click).toHaveBeenCalledTimes(1);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock");
  });

  test("erreur réseau → affiche 'Erreur lors de l'export' dans #export-csv-message", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await exportOrders();

    expect(document.getElementById("export-csv-message").textContent).toBe("Erreur lors de l'export");
  });

  test("réponse HTTP non-OK → affiche 'Erreur lors de l'export' dans #export-csv-message", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await exportOrders();

    expect(document.getElementById("export-csv-message").textContent).toBe("Erreur lors de l'export");
  });

  test("erreur sur response.blob() → affiche 'Erreur lors de l'export' dans #export-csv-message", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => null },
      blob: jest.fn().mockRejectedValue(new Error("Blob error")),
    });

    await exportOrders();

    expect(document.getElementById("export-csv-message").textContent).toBe("Erreur lors de l'export");
  });

  test("clic sur #export-csv-btn appelle /orders/export.csv", async () => {
    document.body.innerHTML = `
      <select id="status-filter"><option value="">Tous</option></select>
      <button id="export-csv-btn">Exporter en CSV</button>
      <span id="export-csv-message"></span>
      <ul id="orders-list"></ul>
    `;

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([])),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (name) => (name === "X-Total-Count" ? "3" : null) },
        blob: jest.fn().mockResolvedValue(new Blob()),
      });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("export-csv-btn").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const exportUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(exportUrl.pathname).toContain("/orders/export.csv");
  });

  test("clic sur #export-csv-btn transmet les cinq filtres actifs à /orders/export.csv", async () => {
    document.body.innerHTML = `
      <select id="status-filter">
        <option value="">Tous</option>
        <option value="paid">Payée</option>
      </select>
      <button id="export-csv-btn">Exporter en CSV</button>
      <span id="export-csv-message"></span>
      <ul id="orders-list"></ul>
    `;

    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([])),
      })
      .mockResolvedValueOnce({
        ok: true,
        headers: { get: (name) => (name === "X-Total-Count" ? "7" : null) },
        blob: jest.fn().mockResolvedValue(new Blob()),
      });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("status-filter").value = "paid";
    document.getElementById("sort-filter").value = "date_desc";
    document.getElementById("from-filter").value = "2024-01-01";
    document.getElementById("to-filter").value = "2024-12-31";
    document.getElementById("customer-name-filter").value = "Dupont";

    document.getElementById("export-csv-btn").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const exportUrl = new URL(global.fetch.mock.calls[1][0]);
    expect(exportUrl.pathname).toContain("/orders/export.csv");
    expect(exportUrl.searchParams.get("status")).toBe("paid");
    expect(exportUrl.searchParams.get("sort")).toBe("date_desc");
    expect(exportUrl.searchParams.get("from")).toBe("2024-01-01");
    expect(exportUrl.searchParams.get("to")).toBe("2024-12-31");
    expect(exportUrl.searchParams.get("customerName")).toBe("Dupont");
  });

  test("clic sur #export-csv-btn désactive le bouton pendant l'export et le réactive ensuite", async () => {
    document.body.innerHTML = `
      <select id="status-filter"><option value="">Tous</option></select>
      <button id="export-csv-btn">Exporter en CSV</button>
      <span id="export-csv-message"></span>
      <ul id="orders-list"></ul>
    `;

    let resolveExport;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(paginatedResponse([])),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveExport = () =>
            resolve({
              ok: true,
              headers: { get: () => "0" },
              blob: jest.fn().mockResolvedValue(new Blob()),
            });
        })
      );

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const btn = document.getElementById("export-csv-btn");
    btn.click();
    expect(btn.disabled).toBe(true);

    resolveExport();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(btn.disabled).toBe(false);
  });
});

describe("searchOrderById — SHIAAAAAAAAAAAAAAAAAAAAAAAA-614", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <ul id="orders-list"><li>Commande #1 — 100 XPF (paid)</li></ul>
      <div id="order-id-result"></div>
    `;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("S1 : commande existante → fiche dans #order-id-result avec total, status, clientName", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 42,
        total: 1500,
        currency: "XPF",
        status: "paid",
        clientName: "Jean Dupont",
      }),
    });

    await searchOrderById(42);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).toContain("Commande #42");
    expect(result.textContent).toContain("1500 XPF");
    expect(result.textContent).toContain("paid");
    expect(result.textContent).toContain("Jean Dupont");
    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.pathname).toBe("/orders/42");
  });

  test("S1 : la liste reste inchangée quand une fiche est trouvée", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 1,
        total: 100,
        currency: "XPF",
        status: "paid",
        clientName: "Alice",
      }),
    });

    await searchOrderById(1);

    expect(document.getElementById("orders-list").textContent).toContain("Commande #1");
  });

  test("S2 : id inexistant → « Aucune commande trouvée pour le numéro X » (D3)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await searchOrderById(99);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).toBe("Aucune commande trouvée pour le numéro 99");
  });

  test("S2 : la réponse { error: 'Not found' } brute n'est pas affichée (D3)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await searchOrderById(7);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).not.toContain("Not found");
    expect(result.textContent).not.toContain('"error"');
  });

  test("S2 : la liste reste inchangée quand l'id est introuvable", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
    });

    await searchOrderById(99);

    expect(document.getElementById("orders-list").textContent).toContain("Commande #1");
  });

  test("S3 : id vide → aucun appel API, #order-id-result inchangé (D5)", async () => {
    global.fetch = jest.fn();
    document.getElementById("order-id-result").textContent = "initial";

    await searchOrderById("");

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("order-id-result").textContent).toBe("initial");
  });

  test("S4 : erreur 5xx → message générique dans #order-id-result (D6)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await searchOrderById(1);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).toBe("Erreur lors de la recherche de la commande");
  });

  test("S4 : erreur réseau → message générique (D6)", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    await searchOrderById(1);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).toBe("Erreur lors de la recherche de la commande");
  });

  test("S4 : la liste reste visible en cas d'erreur 5xx (D6)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    });

    await searchOrderById(1);

    expect(document.getElementById("orders-list").textContent).toContain("Commande #1");
  });

  test("clientName null → fiche affichée sans crash, sans 'null' dans le texte", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: jest.fn().mockResolvedValue({
        id: 5,
        total: 200,
        currency: "EUR",
        status: "cancelled",
        clientName: null,
      }),
    });

    await searchOrderById(5);

    const result = document.getElementById("order-id-result");
    expect(result.textContent).toContain("Commande #5");
    expect(result.textContent).toContain("200 EUR");
    expect(result.textContent).not.toContain("null");
  });

  test("index.html : champ #order-id-search et bouton #order-id-search-btn présents en tête de liste", () => {
    const html = fs.readFileSync(path.resolve(__dirname, "../index.html"), "utf8");
    expect(html).toContain('id="order-id-search"');
    expect(html).toContain('id="order-id-search-btn"');
    expect(html).toContain('id="order-id-result"');
    const searchPos = html.indexOf('id="order-id-search"');
    const listPos = html.indexOf('id="orders-list"');
    expect(searchPos).toBeLessThan(listPos);
  });

  test("câblage : clic sur #order-id-search-btn déclenche l'appel API (D4)", async () => {
    document.body.innerHTML = `
      <select id="status-filter"><option value="">Tous</option></select>
      <input id="order-id-search" type="number" min="1" />
      <button id="order-id-search-btn">Rechercher</button>
      <div id="order-id-result"></div>
      <ul id="orders-list"></ul>
    `;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 42,
          total: 1500,
          currency: "XPF",
          status: "paid",
          clientName: "Jean Dupont",
        }),
      });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    document.getElementById("order-id-search").value = "42";
    document.getElementById("order-id-search-btn").click();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const url = new URL(global.fetch.mock.calls[1][0]);
    expect(url.pathname).toBe("/orders/42");
  });

  test("câblage : touche Entrée dans #order-id-search déclenche l'appel API (D4)", async () => {
    document.body.innerHTML = `
      <select id="status-filter"><option value="">Tous</option></select>
      <input id="order-id-search" type="number" min="1" />
      <button id="order-id-search-btn">Rechercher</button>
      <div id="order-id-result"></div>
      <ul id="orders-list"></ul>
    `;
    global.fetch = jest.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue({ data: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({
          id: 7,
          total: 300,
          currency: "XPF",
          status: "pending",
          clientName: "Marie",
        }),
      });

    document.dispatchEvent(new Event("DOMContentLoaded"));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const input = document.getElementById("order-id-search");
    input.value = "7";
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const url = new URL(global.fetch.mock.calls[1][0]);
    expect(url.pathname).toBe("/orders/7");
  });
});
