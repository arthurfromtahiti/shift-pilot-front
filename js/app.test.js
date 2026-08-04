/**
 * Tests d'acceptation — CLA-121 / CLA-233
 */

const { loadActiveOrders } = require("./app.js");

describe("loadActiveOrders", () => {
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

    await loadActiveOrders();

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

    await loadActiveOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(2);
    expect(list.children[0].textContent).toBe("Commande #1 — 25 XPF (pending)");
    expect(list.children[1].textContent).toBe("Commande #2 — 50 XPF (ready)");
    expect(list.textContent).not.toContain("Aucune commande");
  });

  test("affiche order.total directement — le champ XPF natif du back (CLA-233)", async () => {
    // CLA-195 a retiré totalXpf du back ; order.total est déjà en XPF, sans division
    const orders = [{ id: 42, total: 1500, status: "pending" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadActiveOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #42 — 1500 XPF (pending)");
  });

  test("appel réseau cible /orders?active=true", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadActiveOrders();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders?active=true")
    );
  });

  test("aucun texte « undefined » n'apparaît dans le rendu (régression CLA-233)", async () => {
    const orders = [{ id: 7, total: 300, status: "ready" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadActiveOrders();

    const list = document.getElementById("orders-list");
    expect(list.textContent).not.toContain("undefined");
  });

  test("la liste est ré-initialisée avant chaque rendu", async () => {
    const firstCall = [{ id: 1, total: 100, status: "pending" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(firstCall),
    });
    await loadActiveOrders();

    const secondCall = [{ id: 2, total: 200, status: "ready" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(secondCall),
    });
    await loadActiveOrders();

    const list = document.getElementById("orders-list");
    expect(list.children.length).toBe(1);
    expect(list.children[0].textContent).toBe("Commande #2 — 200 XPF (ready)");
  });
});
