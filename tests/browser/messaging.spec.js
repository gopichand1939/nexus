import { test, expect } from '@playwright/test';
import { randomBytes } from 'node:crypto';

test('two accounts verify devices, exchange encrypted messages and reconnect', async ({ browser, baseURL }) => {
  if (process.env.NEXUS_DISPOSABLE_TEST !== 'true' || !['localhost', '127.0.0.1'].includes(new URL(baseURL).hostname)) {
    throw new Error('Start the isolated test Compose project and set NEXUS_DISPOSABLE_TEST=true. This test creates and deletes accounts.');
  }
  const password = randomBytes(24).toString('base64url');
  const suffix = randomBytes(5).toString('hex');
  const users = [];
  async function register(label) {
    const context = await browser.newContext({ baseURL });
    const page = await context.newPage();
    const user = { context, page, name: `browser_${label}_${suffix}`, registered: false };
    users.push(user);
    page.on('pageerror', error => console.error(`Browser ${label}: ${error.message}`));
    await page.goto('/');
    await page.getByRole('button', { name: 'Create an account', exact: true }).click();
    await page.getByLabel('Display name').fill(label);
    await page.getByLabel('Username', { exact: true }).fill(user.name);
    await page.getByLabel('Password', { exact: true }).fill(password);
    const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    expect((await response).status()).toBe(201);
    user.registered = true;
    await expect(page.getByRole('button', { name: 'New conversation', exact: true }).first()).toBeEnabled();
    return user;
  }
  async function fingerprint(page) {
    await page.getByRole('button', { name: 'Verify devices', exact: true }).click();
    const key = page.locator('.key-card code');
    await expect(key).toHaveText(/^[A-Za-z0-9+/]{43}$/);
    const result = await key.innerText();
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    return result;
  }
  async function verify(page, peer, key) {
    await page.getByRole('button', { name: 'Verify devices', exact: true }).click();
    const card = page.locator('.device-card').filter({ hasText: `@${peer.name}:` });
    await expect(card).toHaveCount(1);
    page.once('dialog', dialog => dialog.accept(key));
    await card.getByRole('button', { name: 'Compare & verify' }).click();
    await expect(card.locator('.status')).toHaveText('Verified');
    await page.getByRole('button', { name: 'Close', exact: true }).click();
  }
  async function send(page, message) {
    await page.getByRole('textbox', { name: 'Message', exact: true }).fill(message);
    await page.getByRole('button', { name: 'Send message', exact: true }).click();
  }
  try {
    const alice = await register('alice');
    const bob = await register('bob');
    await alice.page.getByRole('button', { name: 'New conversation', exact: true }).first().click();
    await alice.page.getByRole('textbox', { name: 'Exact username' }).fill(bob.name);
    await alice.page.getByRole('textbox', { name: 'Exact username' }).press('Enter');
    await alice.page.getByRole('button', { name: 'Add', exact: true }).click();
    await alice.page.getByRole('button', { name: 'Start conversation', exact: true }).click();
    await bob.page.locator('.room-item').filter({ hasText: 'Invitation received' }).click();
    await bob.page.getByRole('button', { name: 'Accept invitation', exact: true }).click();
    await expect(bob.page.getByRole('textbox', { name: 'Message', exact: true })).toBeVisible();

    await send(alice.page, 'Blocked until verified');
    await expect(alice.page.getByRole('status')).toContainText('Verify device');
    await expect(bob.page.getByText('Blocked until verified', { exact: true })).toHaveCount(0);
    const aliceKey = await fingerprint(alice.page);
    const bobKey = await fingerprint(bob.page);
    await verify(alice.page, bob, bobKey);
    await verify(bob.page, alice, aliceKey);

    const outgoing = alice.page.waitForRequest(request => request.method() === 'PUT' && request.url().includes('/send/m.room.encrypted/'));
    await send(alice.page, 'Hello from Alice');
    const encrypted = (await outgoing).postDataJSON();
    expect(encrypted.algorithm).toBe('m.megolm.v1.aes-sha2');
    expect(JSON.stringify(encrypted)).not.toContain('Hello from Alice');
    await expect(bob.page.getByText('Hello from Alice', { exact: true })).toBeVisible();
    await send(bob.page, 'Hello from Bob');
    await expect(alice.page.getByText('Hello from Bob', { exact: true })).toBeVisible();

    await bob.page.reload();
    await bob.page.locator('.room-item').filter({ hasText: 'alice' }).click();
    await expect(bob.page.getByText('Hello from Alice', { exact: true })).toBeVisible();
    await send(bob.page, 'Still connected after refresh');
    await expect(alice.page.getByText('Still connected after refresh', { exact: true })).toBeVisible();
  } finally {
    const failures = [];
    for (const user of users) {
      try {
        if (user.registered) {
          const csrf = (await user.context.cookies()).find(cookie => cookie.name === 'nexus_csrf')?.value;
          const response = await user.context.request.delete('/api/users/me', {
            headers: { Origin: new URL(baseURL).origin, 'X-CSRF-Token': csrf || '' },
            data: { password },
          });
          if (response.status() !== 204) failures.push(`${user.name}: HTTP ${response.status()}`);
        }
      } finally { await user.context.close(); }
    }
    expect(failures, 'Disposable account cleanup').toEqual([]);
  }
});
