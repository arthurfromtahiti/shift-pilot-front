import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Setup mocks avant l'import du module (le module lit window/document au chargement)
const fetchedUrls = [];
const renderedItems = [];

const mockListEl = {
  innerHTML: "",
  appendChild(item) {
    renderedItems.push(item.textContent);
  },
};

global.window = { API_BASE_URL: "http://test.local" };
global.fetch = async (url) => {
  fetchedUrls.push(url.toString());
  return {
    ok: true,
    json: async () => ({
      orders: [
        { id: 1, total: 1000, status: "paid" },
        { id: 2, total: 2000, status: "cancelled" },
      ],
      pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
    }),
  };
};
const createEl = () => ({
  textContent: "",
  style: {},
  className: "",
  innerHTML: "",
  dataset: {},
  appendChild() {},
  addEventListener() {},
});

global.document = {
  addEventListener: () => {},
  getElementById: (id) => (id === "orders-list" ? mockListEl : null),
  createElement: createEl,
};

const { loadOrders } = await import("../js/app.js");

test("le sélecteur est présent dans index.html avec les statuts du contrat back", async () => {
  const html = await fs.readFile(resolve(__dirname, "../index.html"), "utf8");
  assert.ok(html.includes('id="status-filter"'), "le sélecteur #status-filter doit être présent");
  assert.ok(html.includes('value="paid"'), "l'option paid doit être présente");
  assert.ok(html.includes('value="cancelled"'), "l'option cancelled doit être présente");
  assert.ok(!html.includes('value="pending"'), "l'option pending ne doit pas être présente");
  assert.ok(!html.includes('value="in_progress"'), "l'option in_progress ne doit pas être présente");
  assert.ok(!html.includes('value="delivered"'), "l'option delivered ne doit pas être présente");
});

test("requête par défaut (Tous) n'envoie pas active et n'envoie pas status — SHIAAAAAAAAAAAAAAAAAAAAAAAA-358", async () => {
  fetchedUrls.length = 0;
  await loadOrders();
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.has("active"), false, "active ne doit pas être présent pour afficher toutes les commandes");
  assert.equal(url.searchParams.has("status"), false, "status ne doit pas être présent");
});

test("requête avec status envoie status sans active", async () => {
  fetchedUrls.length = 0;
  await loadOrders("paid");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.has("active"), false, "active ne doit pas être présent");
  assert.equal(url.searchParams.get("status"), "paid", "status=paid doit être présent");
});

test("la liste est re-rendue après chargement", async () => {
  renderedItems.length = 0;
  mockListEl.innerHTML = "";
  await loadOrders();
  assert.ok(renderedItems.length > 0, "la liste doit contenir des éléments après chargement");
  assert.ok(
    renderedItems.some((t) => t.includes("#1")),
    "la liste doit afficher les commandes retournées par l'API"
  );
});

test("sort=client_asc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-412", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "client_asc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "client_asc", "sort=client_asc doit être présent dans l'URL");
});

test("sort=client_desc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-412", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "client_desc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "client_desc", "sort=client_desc doit être présent dans l'URL");
});

test("les options client_asc et client_desc sont présentes dans le sélecteur de tri — SHIAAAAAAAAAAAAAAAAAAAAAAAA-412", async () => {
  const source = await fs.readFile(resolve(__dirname, "../js/app.js"), "utf8");
  assert.ok(source.includes('"client_asc"'), 'l\'option client_asc doit être présente dans app.js');
  assert.ok(source.includes('"client_desc"'), 'l\'option client_desc doit être présente dans app.js');
  assert.ok(source.includes("Client A → Z"), 'le libellé "Client A → Z" doit être présent');
  assert.ok(source.includes("Client Z → A"), 'le libellé "Client Z → A" doit être présent');
});

test("sort=status_asc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-437", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "status_asc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "status_asc", "sort=status_asc doit être présent dans l'URL");
});

test("sort=status_desc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-437", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "status_desc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "status_desc", "sort=status_desc doit être présent dans l'URL");
});

test("les options status_asc et status_desc sont présentes dans le sélecteur de tri — SHIAAAAAAAAAAAAAAAAAAAAAAAA-437", async () => {
  const source = await fs.readFile(resolve(__dirname, "../js/app.js"), "utf8");
  assert.ok(source.includes('"status_asc"'), 'l\'option status_asc doit être présente dans app.js');
  assert.ok(source.includes('"status_desc"'), 'l\'option status_desc doit être présente dans app.js');
  assert.ok(source.includes("Statut A → Z"), 'le libellé "Statut A → Z" doit être présent');
  assert.ok(source.includes("Statut Z → A"), 'le libellé "Statut Z → A" doit être présent');
});

test("sort=total_asc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-463", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "total_asc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "total_asc", "sort=total_asc doit être présent dans l'URL");
});

test("sort=total_desc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-463", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "total_desc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "total_desc", "sort=total_desc doit être présent dans l'URL");
});

test("les options total_asc et total_desc sont présentes dans le sélecteur de tri — SHIAAAAAAAAAAAAAAAAAAAAAAAA-463", async () => {
  const source = await fs.readFile(resolve(__dirname, "../js/app.js"), "utf8");
  assert.ok(source.includes('"total_asc"'), 'l\'option total_asc doit être présente dans app.js');
  assert.ok(source.includes('"total_desc"'), 'l\'option total_desc doit être présente dans app.js');
  assert.ok(source.includes("Total croissant"), 'le libellé "Total croissant" doit être présent');
  assert.ok(source.includes("Total décroissant"), 'le libellé "Total décroissant" doit être présent');
});
