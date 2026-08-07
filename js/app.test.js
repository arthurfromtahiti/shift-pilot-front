/**
 * Tests d'acceptation — CLA-121, CLA-95, CLA-195, CLA-227, SHIAAAAAAAAAAAAAAAAAAAAAAAA-250, SHIAAAAAAAAAAAAAAAAAAAAAAAA-343, SHIAAAAAAAAAAAAAAAAAAAAAAAA-374
 * État vide : afficher "Aucune commande" quand la liste est vide
 */

const fs = require("fs");
const path = require("path");
const { loadOrders, loadOrderHistory } = require("./app.js");

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
