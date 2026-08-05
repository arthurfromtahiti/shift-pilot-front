/**
 * Tests d'acceptation — CLA-121, CLA-95, CLA-195, CLA-227
 * État vide : afficher "Aucune commande" quand la liste est vide
 */

const fs = require("fs");
const path = require("path");
const { loadOrders, cancelOrder } = require("./app.js");

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

describe("cancelOrder — CLA-307 appel API annulation", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("envoie POST /orders/:id/cancel avec header X-User-Id", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue({ id: 5, status: "cancelled_by_client" }),
    });

    await cancelOrder(5, 42);

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/orders/5/cancel"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-User-Id": "42" }),
      })
    );
  });

  test("retourne l'objet order complet après 200", async () => {
    const updated = { id: 5, status: "cancelled_by_client", cancelledByUserId: 42 };
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: jest.fn().mockResolvedValue(updated),
    });

    const result = await cancelOrder(5, 42);
    expect(result).toEqual(updated);
  });

  test("lève 'Non autorisé' sur réponse 401", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 401 });
    await expect(cancelOrder(5, 42)).rejects.toThrow("Non autorisé");
  });

  test("lève 'Cette commande ne vous appartient pas' sur réponse 403", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 403 });
    await expect(cancelOrder(5, 42)).rejects.toThrow("Cette commande ne vous appartient pas");
  });

  test("lève 'Cette commande ne peut plus être annulée' sur réponse 409", async () => {
    global.fetch = jest.fn().mockResolvedValue({ status: 409 });
    await expect(cancelOrder(5, 42)).rejects.toThrow("Cette commande ne peut plus être annulée");
  });
});

describe("loadOrders — CLA-307 bouton Annuler", () => {
  const flushPromises = () => new Promise((r) => setTimeout(r, 0));

  beforeEach(() => {
    document.body.innerHTML = '<ul id="orders-list"></ul>';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("pas de bouton Annuler pour une commande non-paid (pending)", async () => {
    const orders = [{ id: 1, total: 100, status: "pending", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(orders) });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    expect(list.querySelector("button")).toBeNull();
  });

  test("pas de bouton Annuler quand aucun currentUserId fourni", async () => {
    const orders = [{ id: 2, total: 200, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(orders) });

    await loadOrders();

    const list = document.getElementById("orders-list");
    expect(list.querySelector("button")).toBeNull();
  });

  test("pas de bouton Annuler quand order.userId !== currentUserId", async () => {
    const orders = [{ id: 3, total: 300, status: "paid", currency: "XPF", userId: 99 }];
    global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(orders) });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    expect(list.querySelector("button")).toBeNull();
  });

  test("bouton Annuler présent pour commande paid appartenant au currentUserId", async () => {
    const orders = [{ id: 4, total: 400, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(orders) });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    const btn = list.querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn.textContent).toBe("Annuler");
  });

  test("pas de bouton Annuler pour une commande cancelled_by_client", async () => {
    const orders = [{ id: 5, total: 500, status: "cancelled_by_client", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn().mockResolvedValue({ json: jest.fn().mockResolvedValue(orders) });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    expect(list.querySelector("button")).toBeNull();
  });

  test("clic Annuler → appel POST /orders/:id/cancel avec X-User-Id correct", async () => {
    const orders = [{ id: 6, total: 600, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(orders) })
      .mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 6, status: "cancelled_by_client" }),
      });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    list.querySelector("button").click();
    await flushPromises();

    const cancelCall = global.fetch.mock.calls[1];
    expect(cancelCall[0]).toContain("/orders/6/cancel");
    expect(cancelCall[1].method).toBe("POST");
    expect(cancelCall[1].headers["X-User-Id"]).toBe("7");
  });

  test("après réponse 200 : statut cancelled_by_client visible, bouton retiré", async () => {
    const orders = [{ id: 7, total: 700, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(orders) })
      .mockResolvedValueOnce({
        status: 200,
        json: jest.fn().mockResolvedValue({ id: 7, status: "cancelled_by_client" }),
      });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    list.querySelector("button").click();
    await flushPromises();

    const item = list.children[0];
    expect(item.textContent).toContain("cancelled_by_client");
    expect(item.querySelector("button")).toBeNull();
  });

  test("erreur 401 → affiche 'Non autorisé' sur la ligne", async () => {
    const orders = [{ id: 8, total: 800, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(orders) })
      .mockResolvedValueOnce({ status: 401 });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    list.querySelector("button").click();
    await flushPromises();

    expect(list.children[0].textContent).toContain("Non autorisé");
  });

  test("erreur 403 → affiche 'Cette commande ne vous appartient pas' sur la ligne", async () => {
    const orders = [{ id: 9, total: 900, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(orders) })
      .mockResolvedValueOnce({ status: 403 });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    list.querySelector("button").click();
    await flushPromises();

    expect(list.children[0].textContent).toContain("Cette commande ne vous appartient pas");
  });

  test("erreur 409 → affiche 'Cette commande ne peut plus être annulée' sur la ligne", async () => {
    const orders = [{ id: 10, total: 1000, status: "paid", currency: "XPF", userId: 7 }];
    global.fetch = jest.fn()
      .mockResolvedValueOnce({ json: jest.fn().mockResolvedValue(orders) })
      .mockResolvedValueOnce({ status: 409 });

    await loadOrders(undefined, undefined, undefined, undefined, 7);

    const list = document.getElementById("orders-list");
    list.querySelector("button").click();
    await flushPromises();

    expect(list.children[0].textContent).toContain("Cette commande ne peut plus être annulée");
  });
});
