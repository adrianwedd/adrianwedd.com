#!/usr/bin/env node
// Run against the locally built site. Never submits an enquiry or sends mail.
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
const base = process.env.E2E_BASE_URL || 'http://localhost:4322';
const output = 'docs/campaigns/on-fire/evidence';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const observations = [];
try {
  for (const [name, width, height] of [
    ['mobile', 390, 844],
    ['tablet', 768, 1024],
    ['desktop', 1440, 1000],
  ]) {
    for (const theme of ['dark', 'light']) {
      const context = await browser.newContext({
        viewport: { width, height },
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(`${base}/on-fire/`);
      await page.locator('#consent-reject').waitFor({ state: 'visible' });
      if (name === 'mobile' && theme === 'dark') {
        await page.screenshot({ path: `${output}/mobile-consent.png` });
        await page.locator('#consent-manage').click();
        await page.screenshot({ path: `${output}/mobile-consent-expanded.png` });
        await page.locator('#consent-accept-selected').click();
      } else await page.locator('#consent-reject').click();
      const layout = await page.evaluate(() => {
        const main = document.querySelector('main');
        const heading = document.querySelector('h1');
        const cta = document.querySelector('a[href="#request"]');
        const colour = getComputedStyle(heading);
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          headingWidth: heading.getBoundingClientRect().width,
          ctaBottom: cta?.getBoundingClientRect().bottom,
          textColour: colour.color,
          surface: getComputedStyle(document.body).backgroundColor,
          contentHeight: main.scrollHeight,
        };
      });
      if (layout.overflow) throw new Error(`${name}/${theme}: horizontal overflow`);
      await page.screenshot({ path: `${output}/${name}-${theme}-hero.png` });
      await page.screenshot({ path: `${output}/${name}-${theme}.png`, fullPage: true });
      observations.push({ name, theme, width, height, ...layout });
      await context.close();
    }
  }
  // Motion enabled uses the site's normal shared presentation; no campaign animation.
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    reducedMotion: 'no-preference',
    colorScheme: 'dark',
  });
  const page = await context.newPage();
  await page.goto(`${base}/on-fire/`);
  await page.locator('#consent-reject').click();
  await page.screenshot({ path: `${output}/mobile-motion-enabled.png` });
  await context.close();
  await fs.writeFile(`${output}/render-check.json`, JSON.stringify({ observations }, null, 2) + '\n');
  console.log(JSON.stringify(observations, null, 2));
} finally {
  await browser.close();
}
