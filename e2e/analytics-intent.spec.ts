import { test, expect, type Page } from '@playwright/test';
import { CONSENT_KEY } from './fixtures';

type AnalyticsEvent = { name: string; parameters: Record<string, unknown> };

async function enableAnalytics(page: Page) {
  await page.addInitScript((key) => {
    localStorage.setItem(
      key,
      JSON.stringify({ analytics: true, advertising: false, personalisation: false, timestamp: Date.now() }),
    );
  }, CONSENT_KEY);
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
}

async function events(page: Page): Promise<AnalyticsEvent[]> {
  return page.evaluate(() =>
    ((window as unknown as { dataLayer?: ArrayLike<unknown>[] }).dataLayer || [])
      .map((entry) => Array.from(entry))
      .filter((entry) => entry[0] === 'event')
      .map((entry) => ({ name: String(entry[1]), parameters: (entry[2] || {}) as Record<string, unknown> })),
  );
}

test('@smoke UTM attribution survives an internal View Transition', async ({ page }) => {
  await enableAnalytics(page);
  await page.goto('/?utm_source=facebook&utm_medium=social&utm_campaign=measurement_test&aw_traffic=ci');
  const origin = new URL(page.url()).origin;

  const landing = (await events(page)).find((event) => event.name === 'page_view');
  expect(landing?.parameters).toMatchObject({
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'measurement_test',
    traffic_type: 'ci',
    page_location: `${origin}/`,
    page_path: '/',
  });

  await clickHeaderLink(page, 'Services');
  await expect(page).toHaveURL(/\/services\/$/);
  const pageViews = (await events(page)).filter((event) => event.name === 'page_view');
  expect(pageViews.at(-1)?.parameters).toMatchObject({
    utm_source: 'facebook',
    utm_medium: 'social',
    utm_campaign: 'measurement_test',
    traffic_type: 'ci',
    page_path: '/services/',
  });
});

test('@smoke high-intent and outbound events fire once without query leakage', async ({ page }) => {
  await enableAnalytics(page);
  await page.goto('/services/?utm_source=test&utm_campaign=measurement_test&secret=private-value');
  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), true);
  });

  await page.locator('a[href^="https://cv.adrianwedd.com/"]').first().click();
  let captured = await events(page);
  expect(captured.filter((event) => event.name === 'cv_view')).toHaveLength(1);
  expect(captured.filter((event) => event.name === 'outbound_click')).toHaveLength(1);
  expect(captured.find((event) => event.name === 'outbound_click')?.parameters).toMatchObject({
    link_domain: 'cv.adrianwedd.com',
    link_path: '/',
  });
  expect(JSON.stringify(captured.find((event) => event.name === 'outbound_click'))).not.toContain('private-value');
  expect(captured.every((event) => !String(event.parameters.page_location || '').includes('?'))).toBe(true);

  await page.goto('/contact/');
  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), true);
  });
  await page.locator('a[href^="mailto:adrian@adrianwedd.com"]').first().click();
  captured = await events(page);
  expect(captured.filter((event) => event.name === 'contact_intent')).toHaveLength(1);
  expect(captured.find((event) => event.name === 'contact_intent')?.parameters).toMatchObject({
    contact_method: 'email',
    page_path: '/contact/',
  });
});

test('@smoke navigation works when analytics is unavailable', async ({ page }) => {
  await page.route(/googletagmanager\.com|google-analytics\.com/, (route) => route.abort());
  await page.goto('/services/');
  await page.locator('a[href="/contact/"]:visible').first().click();
  await expect(page).toHaveURL(/\/contact\/$/);
});

test('@smoke article engagement and onward intent remain separate, deduplicated events', async ({ page }) => {
  await enableAnalytics(page);
  await page.goto('/blog/you-cant-protest-if-nobody-is-inconvenienced/');
  await page.evaluate(() => {
    (window as unknown as { __readingMax: number }).__readingMax = 61;
    window.scrollTo(0, document.documentElement.scrollHeight);
    window.dispatchEvent(new Event('scroll'));
  });
  await expect
    .poll(async () => (await events(page)).filter((event) => event.name === 'article_engaged').length)
    .toBe(1);

  await page.evaluate(() => {
    document.addEventListener('click', (event) => event.preventDefault(), true);
  });
  await page.locator('footer a[href="/contact/"]').click();
  const captured = await events(page);
  expect(captured.filter((event) => event.name === 'article_engaged')).toHaveLength(1);
  expect(captured.filter((event) => event.name === 'high_intent_transition')).toHaveLength(1);
  expect(captured.find((event) => event.name === 'high_intent_transition')?.parameters).toMatchObject({
    from_content_type: 'blog_post',
    destination_path: '/contact/',
  });
});
