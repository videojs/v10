import { expect, test } from '@playwright/test';
import { MEDIA } from '../fixtures/resources';
import { DATA_ATTRS, SELECTORS } from '../fixtures/selectors';
import { PlayerPage } from '../page-objects/player';

test.describe('Captions', () => {
  let player: PlayerPage;

  test.beforeEach(async ({ page }) => {
    player = new PlayerPage(page);
    await page.goto('/pages/html-video-mp4.html');
    await player.waitForMediaReady();
  });

  test('captions settings are unavailable without subtitle tracks', async () => {
    await player.showControls();
    await player.settingsButton.click();
    await expect(player.settingsCaptionsItem).toHaveAttribute(DATA_ATTRS.availability, 'unavailable');
    await expect(player.settingsCaptionsItem).toHaveAttribute('aria-disabled', 'true');
  });

  test('captions settings lists tracks when subtitle track is added', async ({ page }) => {
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) return;

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'English';
      track.srclang = 'en';
      track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nTest caption')}`;
      video.appendChild(track);
    });

    await player.showControls();
    await player.openCaptionsSettings();

    const options = page.locator(SELECTORS.activeMenuOptions);
    await expect(options).toHaveCount(2, { timeout: 5_000 });
  });

  test('captions button toggles captions', async ({ page }) => {
    await page.evaluate(() => {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) return;

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'English';
      track.srclang = 'en';
      track.src = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nTest caption')}`;
      video.appendChild(track);
    });

    await player.showControls();
    await player.captionsButton.click();
    await expect(player.captionsButton).toHaveAttribute(DATA_ATTRS.active, '');
    await player.captionsButton.click();
    await expect(player.captionsButton).not.toHaveAttribute(DATA_ATTRS.active);
  });
});

/**
 * hls.js resets every text track on the media element when it attaches, detaches,
 * or loads a source, so a `<track>` that loaded before the source was known used
 * to end up selected but empty — the browser never parses a loaded track again.
 */
test.describe('Captions sideloaded before an hls.js source', () => {
  /** State of the sideloaded track, read from the element the page author sees. */
  const englishTrack = (page: import('@playwright/test').Page) => {
    return page.evaluate(() => {
      const media = document.querySelector('hlsjs-video') as HTMLMediaElement | null;
      const track = Array.from(media?.textTracks ?? []).find(({ label }) => label === 'English');
      return { mode: track?.mode ?? 'missing', cues: track?.cues?.length ?? 0 };
    });
  };

  const waitForManifest = (page: import('@playwright/test').Page) => {
    return page.waitForFunction(() => (document.querySelector('hlsjs-video') as HTMLMediaElement).readyState >= 1);
  };

  test.beforeEach(async ({ page }) => {
    // Reuse the page's registered elements, but start from a media element that
    // has caption tracks and no source yet.
    await page.goto('/pages/html-video-hls.html');
    await page.evaluate(() => {
      const vtt = `data:text/vtt,${encodeURIComponent('WEBVTT\n\n00:00:00.000 --> 00:00:30.000\nSideloaded caption')}`;
      document.getElementById('root')!.innerHTML = `
        <video-player>
          <video-skin style="max-width: 800px; aspect-ratio: 16/9">
            <hlsjs-video playsinline>
              <track default kind="subtitles" label="English" srclang="en" src="${vtt}" />
            </hlsjs-video>
          </video-skin>
        </video-player>`;
    });

    await expect.poll(() => englishTrack(page)).toEqual({ mode: 'showing', cues: 1 });
  });

  test('keeps its cues when the source is assigned after connection', async ({ page }) => {
    await page.evaluate((url) => {
      (document.querySelector('hlsjs-video') as HTMLMediaElement).src = url;
    }, MEDIA.hlsTs.url);
    await waitForManifest(page);

    expect(await englishTrack(page)).toEqual({ mode: 'showing', cues: 1 });
  });

  test('keeps its cues and selection when the source is replaced', async ({ page }) => {
    await page.evaluate((url) => {
      (document.querySelector('hlsjs-video') as HTMLMediaElement).src = url;
    }, MEDIA.hlsTs.url);
    await waitForManifest(page);

    await page.evaluate((url) => {
      (document.querySelector('hlsjs-video') as HTMLMediaElement).src = url;
    }, MEDIA.hlsFmp4.url);
    await waitForManifest(page);

    expect(await englishTrack(page)).toEqual({ mode: 'showing', cues: 1 });
  });
});
