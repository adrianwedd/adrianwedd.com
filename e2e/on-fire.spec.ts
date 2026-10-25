import { test, expect } from '@playwright/test';
import campaign from '../src/data/on-fire.json';

test('campaign advice, honest intake and clipboard work without disclosing applications @smoke', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/google-analytics|googletagmanager|doubleclick|linkedin|ops\.adrianwedd/.test(request.url()))
      external.push(request.url());
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/on-fire/');
  await expect(page).toHaveTitle(
    campaign.closed
      ? 'The Internet Is On Fire | Website Security Advice in Southern Tasmania'
      : 'The Internet Is On Fire | Free Website Security Checks in Southern Tasmania',
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://adrianwedd.com/on-fire/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    campaign.closed ? 'https://adrianwedd.com/og/on-fire-closed.png' : 'https://adrianwedd.com/og/on-fire.png',
  );
  await expect(page.locator('h1')).toHaveText('THE INTERNETIS ON FIRE.');
  await expect(page.locator('#consent-reject')).toBeVisible();
  await page.locator('#consent-reject').click();
  if (!campaign.closed) {
    await page.getByRole('link', { name: 'Request a free check' }).click();
    await expect(page.locator('#request-heading')).toBeInViewport();
    const destination = await page.locator('#fire-email').getAttribute('href');
    const draft = new URL(destination!);
    expect(draft.protocol).toBe('mailto:');
    expect(draft.pathname).toBe('adrian@adrianwedd.com');
    expect(draft.searchParams.get('subject')).toContain('ON FIRE');
    for (const field of [
      'Business name:',
      'Public website URL:',
      'Business location',
      'Contact name:',
      'Contact email:',
      'Authority:',
      'not an awarded place',
    ]) {
      expect(draft.searchParams.get('body')).toContain(field);
    }
    await expect(page.locator('#request')).toContainText('Nothing has been submitted by clicking');
  } else {
    await expect(page.locator('#fire-email')).toHaveCount(0);
  }
  await expect(page.locator('#request form')).toHaveCount(0);
  await expect(page.locator('#offer')).toContainText('Sole traders');
  await expect(page.locator('#offer')).toContainText('separate from my');
  const copy = page.getByRole('button', { name: 'Copy provider message' });
  await copy.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#fire-copy-status')).toContainText('Copied.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('CVE-2026-109618');
  await page.evaluate(() =>
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: () => Promise.reject(new Error('denied')),
    }),
  );
  await copy.click();
  await expect(page.locator('#fire-copy-status')).toContainText('copy it manually');
  expect(external).toEqual([]);
});

test('campaign remains useful without JavaScript @smoke', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${baseURL}/on-fire/`);
  await expect(page.locator('#provider-message')).toContainText('Could you confirm');
  if (!campaign.closed) {
    await expect(page.locator('#fire-email')).toHaveAttribute('href', /^mailto:/);
    await page.getByText('Show the application text to copy').click();
    await expect(page.locator('#request pre')).toContainText('Authority:');
  }
  await expect(page.locator('[data-fire-copy]')).toBeHidden();
  await expect(page.locator('#provider-questions')).toContainText('copy it into an email');
  await context.close();
});

test('local services and privacy explain the separate free offer @smoke', async ({ page }) => {
  await page.goto('/local/');
  await expect(page.locator('a[href="/on-fire/"]')).toBeVisible();
  await expect(page.locator('#paths')).toContainText('A paid diagnostic');
  await page.locator('a[href="/on-fire/"]').click();
  if (!campaign.closed) await expect(page.locator('#fire-email')).toBeVisible();
  else await expect(page.locator('#fire-email')).toHaveCount(0);
  await page.goto('/privacy/');
  await expect(page.locator('#on-fire')).toHaveText('ON FIRE campaign enquiries');
});

test('closed campaign retains advice and removes application and promotional metadata @smoke', async ({ page }) => {
  test.skip(!campaign.closed, 'The campaign is open in this build.');
  await page.goto('/on-fire/');
  await expect(page.locator('#provider-message')).toContainText('Could you confirm');
  await expect(page.locator('#fire-email')).toHaveCount(0);
  await expect(page.locator('a[href="#request"]')).toHaveCount(0);
  await expect(page.locator('#offer-heading')).toHaveText('The free offer has closed.');
  await expect(page).toHaveTitle('The Internet Is On Fire | Website Security Advice in Southern Tasmania');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    'https://adrianwedd.com/og/on-fire-closed.png',
  );
  await expect(page.locator('meta[name="twitter:image"]')).toHaveAttribute(
    'content',
    'https://adrianwedd.com/og/on-fire-closed.png',
  );
  await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /offer has closed/);
  await page.goto('/local/');
  await expect(page.locator('a[href="/on-fire/"]')).toContainText('free offer closed');
});
