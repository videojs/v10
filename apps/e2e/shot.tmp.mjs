import { chromium } from '@playwright/test';

const OUT = '/tmp/claude-0/-home-user-v10/5b2e0af1-2654-560a-9f07-137f4a31f1b9/scratchpad';
const browser = await chromium.launch();

for (const width of [2000, 1440]) {
  const page = await browser.newPage({ viewport: { width, height: 1100 } });
  for (const [slug, id] of [
    ['twitch-video', 'TwitchVideo-engine-twitch-parent'],
    ['dash-video', 'DashVideo-engine-dashJs-streaming'],
  ]) {
    await page.goto(`http://127.0.0.1:8799/docs/framework/react/reference/${slug}/`, { waitUntil: 'networkidle' });
    const m = await page.evaluate((id) => {
      const tr = document.getElementById(id);
      if (!tr) return { missing: true };
      const table = tr.closest('table');
      // compare the table to the paragraph measure right above the section
      const prose = document.querySelector('#engine-options')?.nextElementSibling;
      return {
        tableWidth: Math.round(table.getBoundingClientRect().width),
        proseWidth: prose ? Math.round(prose.getBoundingClientRect().width) : null,
        bodyOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    }, id);
    console.log(width, slug, JSON.stringify(m));
  }
  if (width === 2000) {
    await page.goto('http://127.0.0.1:8799/docs/framework/react/reference/twitch-video/', { waitUntil: 'networkidle' });
    await page.locator('#engine-options').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${OUT}/twitch-engine-2000.png` });
  }
  await page.close();
}
await browser.close();
