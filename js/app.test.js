/**
 * Tests d'acceptation — CLA-121, CLA-95, CLA-195, CLA-227
 * État vide : afficher "Aucune commande" quand la liste est vide
 */

const fs = require("fs");
const path = require("path");
const { loadOrders } = require("./app.js");

describe("loadOrders", () => {
  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("liste vide → affiche « Aucune commande » dans #orders-list", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
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
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(2);
    expect(list.children[0].textContent).toBe("Commande #1 — 25 XPF (pending)");
    expect(list.children[1].textContent).toBe("Commande #2 — 50 XPF (ready)");
    expect(list.textContent).not.toContain("Aucune commande");
  });

  test("affiche order.total directement sans transformation", async () => {
    // Le back stocke et expose total déjà en XPF, sans champ totalXpf dérivé — CLA-195
    const orders = [{ id: 42, total: 1500, status: "pending", currency: "XPF" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #42 — 1500 XPF (pending)");
  });

  test("appel réseau par défaut cible /orders?active=true sans status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders?active=true")
    );
    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("status")).toBe(false);
  });

  test("appel réseau avec status envoie active=true ET status — CLA-95", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders("paid");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("active")).toBe("true");
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
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #1 — 42 EUR (paid)");
  });

  test("affiche XPF quand currency vaut XPF — CLA-262", async () => {
    const orders = [{ id: 7, total: 500, status: "paid", currency: "XPF" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #7 — 500 XPF (paid)");
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
      json: jest.fn().mockResolvedValue(orders),
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
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #1 — 100 XPF (paid)");
  });

  test("sort=date_asc ajoute ?sort=date_asc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders(undefined, "date_asc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("date_asc");
    expect(url.searchParams.get("active")).toBe("true");
  });

  test("sort=date_desc ajoute ?sort=date_desc à la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders(undefined, "date_desc");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("sort")).toBe("date_desc");
  });

  test("from et to ajoutent les paramètres de plage de dates", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders(undefined, undefined, "2024-02-01", "2024-03-31");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.get("to")).toBe("2024-03-31");
  });

  test("tous les paramètres se combinent (status + sort + from + to)", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders("paid", "date_desc", "2024-02-01", "2024-03-31");

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("active")).toBe("true");
    expect(url.searchParams.get("status")).toBe("paid");
    expect(url.searchParams.get("sort")).toBe("date_desc");
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.get("to")).toBe("2024-03-31");
  });

  test("from seul sans to → seul from dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders(undefined, undefined, "2024-02-01", undefined);

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.get("from")).toBe("2024-02-01");
    expect(url.searchParams.has("to")).toBe(false);
  });

  test("sans sort → pas de param sort dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("sort")).toBe(false);
  });

  test("sans from ni to → pas de paramètres de plage dans la requête", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders();

    const url = new URL(global.fetch.mock.calls[0][0]);
    expect(url.searchParams.has("from")).toBe(false);
    expect(url.searchParams.has("to")).toBe(false);
  });
});
