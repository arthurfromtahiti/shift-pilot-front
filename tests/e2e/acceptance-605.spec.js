// E2E — SHIAAAAAAAAAAAAAAAAAAAAAAAA-605 : 4 scénarios d'acceptation métier
// S1 : commande trouvée → affiche total, status, clientName
// S2 : commande introuvable (404) → message dédié
// S3 : champ vide → zéro appel réseau vers /orders/:id
// S4 : erreur serveur (5xx) → message générique

const { test, expect } = require('@playwright/test');

const MOCK_LIST = {
  orders: [],
  pagination: { total: 0, page: 1, limit: 20, totalPages: 1 },
};

test.describe('SHIAAAAAAAAAAAAAAAAAAAAAAAA-605 — Retrouver une commande par numéro', () => {
  test.beforeEach(async ({ page }) => {
    // Redirige l'API vers un domaine interceptable distinct du serveur de pages
    await page.addInitScript(() => {
      window.API_BASE_URL = 'http://api.test';
    });
    // Mock la liste des commandes pour éviter les erreurs réseau non liées au scénario
    await page.route(/^http:\/\/api\.test\/orders(\?.*)?$/, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_LIST),
      })
    );
  });

  test('S1 : commande trouvée → affiche total, status et clientName', async ({ page }) => {
    await page.route('http://api.test/orders/42', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 42, total: 1500, currency: 'EUR', status: 'paid', clientName: 'Dupont' }),
      })
    );

    await page.goto('/');
    await page.fill('#order-id-search', '42');
    await page.click('#order-id-search-btn');

    const result = page.locator('#order-id-result');
    await expect(result).toContainText('Commande #42');
    await expect(result).toContainText('1500');
    await expect(result).toContainText('paid');
    await expect(result).toContainText('Dupont');
  });

  test('S2 : commande introuvable (404) → "Aucune commande trouvée pour le numéro 999"', async ({ page }) => {
    await page.route('http://api.test/orders/999', (route) =>
      route.fulfill({ status: 404, body: '' })
    );

    await page.goto('/');
    await page.fill('#order-id-search', '999');
    await page.click('#order-id-search-btn');

    await expect(page.locator('#order-id-result')).toContainText(
      'Aucune commande trouvée pour le numéro 999'
    );
  });

  test('S3 : champ vide → clic bouton → zéro appel réseau vers /orders/:id', async ({ page }) => {
    const searchCalls = [];
    await page.route(/http:\/\/api\.test\/orders\/\d+/, (route) => {
      searchCalls.push(route.request().url());
      route.abort();
    });

    await page.goto('/');
    // Champ vide par défaut — clic direct
    await page.click('#order-id-search-btn');
    await page.waitForTimeout(300);

    expect(searchCalls).toHaveLength(0);
  });

  test('S4 : erreur serveur (5xx) → "Une erreur est survenue, veuillez réessayer"', async ({ page }) => {
    await page.route('http://api.test/orders/1', (route) =>
      route.fulfill({ status: 500, body: '' })
    );

    await page.goto('/');
    await page.fill('#order-id-search', '1');
    await page.click('#order-id-search-btn');

    await expect(page.locator('#order-id-result')).toContainText(
      'Une erreur est survenue, veuillez réessayer'
    );
  });
});
