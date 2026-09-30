import { expect, type Page, test } from '@playwright/test';

import { MEDIA } from '../../../shared/fixtures/resources';
import { PlayerPage } from '../../../shared/page-objects/player';

/**
 * Apple JSON chapters (`#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters"`) on the non-SPF HLS paths. The stream is
 * real; its multivariant playlist is rewritten on the way in to reference a chapters document the test serves.
 */

/** A 25-second Mux asset; the chapters below split it in three. */
const SRC = MEDIA.hlsFmp4.url;
const CHAPTERS_URL = 'https://chapters.test/chapters.json';
const METADATA_URL = SRC.replace('.m3u8', '/metadata.json');

const THREE_CHAPTERS = [
  { 'start-time': 0, titles: [{ language: 'en', title: 'Intro' }] },
  { 'start-time': 8, titles: [{ language: 'en', title: 'Middle' }] },
  { 'start-time': 16, titles: [{ language: 'en', title: 'Outro' }] },
];

/** What Mux publishes for a titled asset with no chapters: the asset title as the only one. */
const TITLE_ONLY = [{ 'start-time': 0, titles: [{ language: 'und', title: 'Asset title' }] }];

/** Reference the document at `uri` from the playlist, serve `document` there, and record every request for it. */
async function serveChapters(page: Page, uri: string, document: unknown): Promise<string[]> {
  const requests: string[] = [];

  await page.route(SRC, async (route) => {
    const response = await route.fetch();
    const playlist = (await response.text()).replace(
      '#EXTM3U',
      `#EXTM3U\n#EXT-X-SESSION-DATA:DATA-ID="com.apple.hls.chapters",URI="${uri}"`
    );

    await route.fulfill({ response, body: playlist });
  });
  await page.route(uri, (route) => {
    requests.push(route.request().url());

    return route.fulfill({ json: document, headers: { 'access-control-allow-origin': '*' } });
  });

  return requests;
}

async function open(page: Page, media: string): Promise<PlayerPage> {
  const player = new PlayerPage(page);

  await page.goto(`/hls-chapters.html?media=${media}&src=${encodeURIComponent(SRC)}`);
  await player.waitForMediaReady();

  return player;
}

/** Cue texts of every chapters track on the element, in `textTracks` order. A disabled track reads as empty. */
function readChaptersTracks(page: Page, media: string): Promise<string[][]> {
  return page
    .locator(media)
    .evaluate((element: HTMLMediaElement) =>
      [...element.textTracks]
        .filter((track) => track.kind === 'chapters')
        .map((track) => [...(track.cues ?? [])].map((cue) => (cue as VTTCue).text))
    );
}

function canPlayNativeHls(page: Page): Promise<boolean> {
  return page.evaluate(() => document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== '');
}

test.describe('HLS JSON chapters', () => {
  for (const media of ['hlsjs-video', 'native-hls-video']) {
    test(`project onto the time slider (${media})`, async ({ page }) => {
      test.skip(media === 'native-hls-video' && !(await canPlayNativeHls(page)), 'No native HLS playback');

      await serveChapters(page, CHAPTERS_URL, THREE_CHAPTERS);

      const player = await open(page, media);

      await expect(page.locator('.media-time-slider-chapter')).toHaveCount(3);

      await player.showControls();
      await player.hoverTimeSlider(50);

      await expect(page.locator('.media-time-slider-chapter-title')).toHaveText('Middle');
    });

    /**
     * Safari reads the same session data itself and adds chapter tracks of its own — one per language, after the
     * `<track>` children, holding no cues. The player reads the first chapters track, so the projected one has to lead
     * and stay the only set with cues.
     */
    test(`keep one set of chapters beside the browser's own (${media})`, async ({ page }) => {
      test.skip(media === 'native-hls-video' && !(await canPlayNativeHls(page)), 'No native HLS playback');

      await serveChapters(page, CHAPTERS_URL, THREE_CHAPTERS);
      await open(page, media);
      await expect.poll(() => readChaptersTracks(page, media)).toContainEqual(['Intro', 'Middle', 'Outro']);

      const tracks = await readChaptersTracks(page, media);

      expect(tracks[0]).toEqual(['Intro', 'Middle', 'Outro']);
      expect(tracks.filter((cues) => cues.length > 0)).toHaveLength(1);
    });
  }

  test('show no chapter for a document with only one', async ({ page }) => {
    await serveChapters(page, CHAPTERS_URL, TITLE_ONLY);

    const player = await open(page, 'hlsjs-video');

    // Projected, and read by the store, but not drawn.
    await expect.poll(() => readChaptersTracks(page, 'hlsjs-video')).toEqual([['Asset title']]);
    await expect(page.locator('.media-time-slider-chapter')).toHaveCount(1);

    await player.showControls();
    await player.hoverTimeSlider(50);

    await expect(page.locator('.media-time-slider-chapter-title')).toHaveText('');
  });

  test('`<mux-video>` fetches the metadata document once, for its title and its chapters', async ({ page }) => {
    const requests = await serveChapters(page, METADATA_URL, THREE_CHAPTERS);

    await open(page, 'mux-video');

    await expect(page.locator('.media-time-slider-chapter')).toHaveCount(3);
    await expect
      .poll(() =>
        page
          .locator('mux-video')
          .evaluate((element) => (element as HTMLElement & { contentData?: { title?: string } }).contentData?.title)
      )
      .toBe('Intro');

    expect(requests).toEqual([METADATA_URL]);
  });
});
