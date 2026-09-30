import { PlayerPage } from '../../../shared/page-objects/player';
import { deepQuery, PAGES, readProbe } from '../probes.ts';
import { expect, test } from '../test.ts';

for (const target of PAGES) {
  test(`${target.path}: skin fallbacks and playback`, async ({ page, caps }, testInfo) => {
    const errors: string[] = [];

    page.on('pageerror', (error) => errors.push(error.message));

    const player = new PlayerPage(page);

    await page.goto(target.path);
    await player.waitForMediaReady();

    const userAgent = await page.evaluate(() => navigator.userAgent);

    await testInfo.attach('browser', { body: userAgent, contentType: 'text/plain' });

    if (caps.browser === 'chrome') expect(userAgent).toContain('Chrome/111.');

    if (caps.browser === 'edge') expect(userAgent).toContain('Edg/111.');

    if (caps.browser === 'playwright-firefox') expect(userAgent).toContain('Firefox/121.');

    if (caps.browser === 'playwright-webkit') expect(userAgent).toContain('Version/16.4');

    if (caps.realMobile) {
      expect(userAgent).toContain(`OS ${caps.osVersion!.replaceAll('.', '_')}`);
    }

    await expect
      .poll(async () => {
        const probe = await page.evaluate<ReturnType<typeof readProbe>>(
          `(${readProbe.toString()})(${deepQuery.toString()})`
        );

        return probe?.styled;
      })
      .toBe(true);

    const probe = await page.evaluate<ReturnType<typeof readProbe>>(
      `(${readProbe.toString()})(${deepQuery.toString()})`
    );

    expect(probe).not.toBeNull();

    if (!probe) throw new Error('The skin root did not settle.');

    expect(probe.visibleClosedPopovers).toBe(0);
    expect(probe.bufferRight).not.toBeNull();
    expect(probe.bufferRight).not.toBe('auto');
    expect(
      target.preset === 'audio' ? ['rgb(255, 255, 255)', 'oklch(1 0 0)'] : ['rgb(0, 0, 0)', 'oklch(0 0 0)']
    ).toContain(probe.primaryForeground);

    if (target.preset === 'video') {
      expect(probe.scrim).toContain('gradient');
      expect(probe.frameBorder).not.toBe('rgb(255, 0, 0)');

      if (!target.path.includes('minimal')) expect(probe.surfaceBlur).toContain('blur');
    }

    // Unsupported H.264 or rejected playback must fail here.
    await player.play();
    await player.waitForPlayback(0.5);
    await player.pause();
    await player.seekTo(25);
    expect(await player.getCurrentTime()).toBeGreaterThan(1);

    if (target.preset === 'audio') await page.addStyleTag({ content: 'body { padding-top: 320px; }' });

    await player.showControls();
    await page.locator('[aria-haspopup="menu"]').first().click();
    await expect(page.locator('[role="menu"][data-open]').first()).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath('menu.png') });
    expect(errors).toEqual([]);
  });
}
