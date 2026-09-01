import { expect, test } from '@playwright/test';

test('bootstraps one store ID on a mobile viewport and updates cart', async ({ page }) => {
  await page.route('https://api.1ecomm.com/v1/headless/stores/**', (route) => route.fulfill({ json: { data: { storeId: '01f5b02f-d7c0-42cd-b880-59f78ea70aa3', apiUrl: 'https://sandbox.test', publishableKey: 'pk_test_demo', apiVersion: 'v1', capabilities: ['catalog', 'cart', 'checkout-preparation'] } } }));
  await page.route('https://sandbox.test/v1/headless/products', (route) => route.fulfill({ json: { data: [{ id: 'p1', name: 'Summit Bottle', description: 'Cold', available: true, price: { amount: '20', currency: 'USD' } }], nextCursor: null, requestId: 'r' } }));
  await page.route('https://sandbox.test/v1/headless/carts', (route) => route.fulfill({ status: 201, json: { data: { items: [] }, cartToken: `hc_${'a'.repeat(43)}`, created: true, requestId: 'r' } }));
  await page.route('https://sandbox.test/v1/headless/carts/current/items', (route) => route.fulfill({ status: 201, json: { data: { items: [{ id: 'line', quantity: 1 }] }, requestId: 'r' } }));
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Summit Bottle' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Summit Bottle to cart' }).click();
  await expect(page.getByText('Cart 1')).toBeVisible();
});
