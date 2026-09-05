import { test, expect } from '@playwright/test';

// The suite-wide context asks for prefers-reduced-motion (see the
// playwright.config.ts comment) so actionability checks don't race
// ScrollReveal's 0.5s transition. That leaves the normal-motion reveal path —
// IntersectionObserver adds .revealed, CSS animates the block in — unexercised
// everywhere else. This spec is the one place the suite runs with motion
// enabled and pins that contract: a below-fold .scroll-reveal block starts
// hidden (global.css .scroll-reveal: opacity 0) and becomes visible when
// scrolled to.
test.use({ contextOptions: { reducedMotion: 'no-preference' } });

test('@smoke below-fold scroll-reveal blocks start hidden and reveal on scroll', async ({
  page,
}) => {
  await page.goto('/');

  // Pick a block that is genuinely below the fold at load; assert loudly if
  // the homepage ever has none.
  const target = await page.evaluate(() => {
    const vh = window.innerHeight;
    const blocks = [...document.querySelectorAll<HTMLElement>('.scroll-reveal')];
    const below = blocks.find((el) => el.getBoundingClientRect().top > vh);
    return below ? blocks.indexOf(below) : -1;
  });
  expect(target, 'a below-fold .scroll-reveal block to exist on /').toBeGreaterThanOrEqual(0);

  const block = page.locator('.scroll-reveal').nth(target);
  await expect(block).not.toHaveClass(/revealed/);
  await expect(block).toHaveCSS('opacity', '0');

  // Scroll to the document bottom so the block clears the observer's
  // -40px bottom rootMargin regardless of where it sits.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(block).toHaveClass(/revealed/);

  // toHaveCSS retries through the 0.5s transition until it settles.
  await expect(block).toHaveCSS('opacity', '1');
});