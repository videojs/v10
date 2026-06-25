import { expect, test } from '@playwright/test';

test.describe('XSS prevention — CustomMediaElement shadow root', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/pages/html-video-hls.html');
    // Wait for hls-video to be defined before creating elements dynamically.
    await page.waitForFunction(() => !!customElements.get('hls-video'));
  });

  test('quote injection in crossorigin does not fire onerror handler', async ({ page }) => {
    // innerHTML on a connected container: attributes are present when the constructor runs.
    const result = await page.evaluate(() => {
      (window as any).__xss = undefined;
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = '<hls-video crossorigin="&quot; onerror=&quot;window.__xss=1&quot;"></hls-video>';
      const el = container.querySelector('hls-video')!;
      return {
        xss: (window as any).__xss,
        hasOnerror: el.shadowRoot?.querySelector('[onerror]') !== null,
        hasUpgraded: el.shadowRoot !== null,
      };
    });

    expect(result.hasUpgraded).toBe(true);
    expect(result.xss).toBeUndefined();
    expect(result.hasOnerror).toBe(false);
  });

  test('angle-bracket injection in crossorigin does not inject sibling elements', async ({ page }) => {
    const result = await page.evaluate(() => {
      (window as any).__xss = undefined;
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML =
        '<hls-video crossorigin="&quot;&gt;&lt;img src=x onerror=&quot;window.__xss=1&quot;&gt;"></hls-video>';
      const el = container.querySelector('hls-video')!;
      return {
        xss: (window as any).__xss,
        hasImg: el.shadowRoot?.querySelector('img') !== null,
        hasScript: el.shadowRoot?.querySelector('script') !== null,
      };
    });

    expect(result.xss).toBeUndefined();
    expect(result.hasImg).toBe(false);
    expect(result.hasScript).toBe(false);
  });

  test('safe attribute values are preserved correctly after escaping', async ({ page }) => {
    const result = await page.evaluate(() => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      container.innerHTML = '<hls-video crossorigin="anonymous"></hls-video>';
      const el = container.querySelector('hls-video')!;
      const video = el.shadowRoot?.querySelector('video');
      return { crossorigin: video?.getAttribute('crossorigin') };
    });

    expect(result.crossorigin).toBe('anonymous');
  });
});
