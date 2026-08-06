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
