/**
 * Tests d'acceptation — CLA-121, CLA-95, CLA-195
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
      { id: 1, total: 25, status: "pending" },
      { id: 2, total: 50, status: "ready" },
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
    const orders = [{ id: 42, total: 1500, status: "pending" }];
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
