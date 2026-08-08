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

const mockExportMsgEl = { textContent: "" };

global.window = { API_BASE_URL: "http://test.local" };
global.fetch = async (url) => {
  fetchedUrls.push(url.toString());
  return {
    ok: true,
    headers: { get: (name) => (name === "X-Total-Count" ? "42" : null) },
    json: async () => ({
      orders: [
        { id: 1, total: 1000, status: "paid" },
        { id: 2, total: 2000, status: "cancelled" },
      ],
      pagination: { total: 2, page: 1, limit: 20, totalPages: 1 },
    }),
    blob: async () => ({}),
  };
};
const createEl = () => ({
  textContent: "",
  style: {},
  className: "",
  innerHTML: "",
  dataset: {},
  href: "",
  download: "",
  click: () => {},
  appendChild() {},
  addEventListener() {},
});

global.document = {
  addEventListener: () => {},
  getElementById: (id) => {
    if (id === "orders-list") return mockListEl;
    if (id === "export-csv-message") return mockExportMsgEl;
    return null;
  },
  createElement: createEl,
};

URL.createObjectURL = () => "blob:mock";
URL.revokeObjectURL = () => {};

const { loadOrders, exportOrders } = await import("../js/app.js");

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

test("sort=id_asc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-444", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "id_asc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "id_asc", "sort=id_asc doit être présent dans l'URL");
});

test("sort=id_desc est transmis tel quel à l'API — SHIAAAAAAAAAAAAAAAAAAAAAAAA-444", async () => {
  fetchedUrls.length = 0;
  await loadOrders(undefined, "id_desc");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.equal(url.searchParams.get("sort"), "id_desc", "sort=id_desc doit être présent dans l'URL");
});

test("les options id_asc et id_desc sont présentes dans le sélecteur de tri — SHIAAAAAAAAAAAAAAAAAAAAAAAA-444", async () => {
  const source = await fs.readFile(resolve(__dirname, "../js/app.js"), "utf8");
  assert.ok(source.includes('"id_asc"'), 'l\'option id_asc doit être présente dans app.js');
  assert.ok(source.includes('"id_desc"'), 'l\'option id_desc doit être présente dans app.js');
  assert.ok(source.includes("ID croissant"), 'le libellé "ID croissant" doit être présent');
  assert.ok(source.includes("ID décroissant"), 'le libellé "ID décroissant" doit être présent');
});

test("le bouton Exporter en CSV est présent dans index.html — SHIAAAAAAAAAAAAAAAAAAAAAAAA-487", async () => {
  const html = await fs.readFile(resolve(__dirname, "../index.html"), "utf8");
  assert.ok(html.includes('id="export-csv-btn"'), 'le bouton #export-csv-btn doit être présent dans index.html');
});

test("exportOrders appelle /orders/export.csv avec les filtres actifs — SHIAAAAAAAAAAAAAAAAAAAAAAAA-487", async () => {
  fetchedUrls.length = 0;
  await exportOrders("paid", "date_desc", "2024-01-01", "2024-12-31", "Dupont");
  assert.equal(fetchedUrls.length, 1, "une seule requête doit être effectuée");
  const url = new URL(fetchedUrls[0]);
  assert.ok(url.pathname.endsWith("/orders/export.csv"), "l'URL doit pointer vers /orders/export.csv");
  assert.equal(url.searchParams.get("status"), "paid", "status=paid doit être présent");
  assert.equal(url.searchParams.get("sort"), "date_desc", "sort=date_desc doit être présent");
  assert.equal(url.searchParams.get("from"), "2024-01-01", "from doit être présent");
  assert.equal(url.searchParams.get("to"), "2024-12-31", "to doit être présent");
  assert.equal(url.searchParams.get("customerName"), "Dupont", "customerName doit être présent");
});

test("exportOrders lit X-Total-Count et affiche le nombre de commandes exportées — SHIAAAAAAAAAAAAAAAAAAAAAAAA-487", async () => {
  mockExportMsgEl.textContent = "";
  fetchedUrls.length = 0;
  await exportOrders();
  assert.ok(
    mockExportMsgEl.textContent.includes("42"),
    "le message doit afficher le nombre de commandes exportées (X-Total-Count=42)"
  );
});
