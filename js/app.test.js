/**
 * Tests d'acceptation — CLA-121
 * État vide : afficher "Aucune commande" quand la liste est vide
 */

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
      { id: 1, totalXpf: 25, status: "pending" },
      { id: 2, totalXpf: 50, status: "ready" },
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

  test("affiche order.totalXpf directement sans diviser par 100", async () => {
    // Le back expose maintenant totalXpf (entier XPF déjà calculé) — CLA-126
    const orders = [{ id: 42, totalXpf: 1500, status: "pending" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.children[0].textContent).toBe("Commande #42 — 1500 XPF (pending)");
  });

  test("appel réseau cible /orders?active=true", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue([]),
    });

    await loadOrders();

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders?active=true")
    );
  });

  test("order.totalXpf absent du back → affiche 'undefined XPF' (bug CLA-233)", async () => {
    // CLA-195 a retiré totalXpf du back ; le back n'envoie plus que total
    const orders = [{ id: 42, total: 1500, status: "pending" }];
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue(orders),
    });

    await loadOrders();

    const list = document.getElementById("orders-list");
    // CE TEST ÉCHOUE sur ce commit : app.js lit encore order.totalXpf → affiche "undefined XPF"
    expect(list.children[0].textContent).toBe("Commande #42 — 1500 XPF (pending)");
  });
});
