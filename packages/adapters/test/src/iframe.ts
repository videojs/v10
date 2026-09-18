import { describe, expect, it, vi } from 'vite-plus/test';

export interface IframeAdapter {
  readonly engine: unknown | null;
  readonly target: HTMLIFrameElement | null;
  readonly paused: boolean;
  readonly ended: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly buffered: TimeRanges;
  readonly played: TimeRanges;
  src: string;
  addEventListener(type: 'loadstart', listener: () => void): void;
  attach(target: HTMLIFrameElement): void;
  detach(): void;
  play(): Promise<void>;
}

/** Assert the detached state shared by iframe-backed playback adapters. */
export function expectIframeAdapterDefaults(media: IframeAdapter, defaultSrc: string): void {
  expect(media.engine).toBe(null);
  expect(media.target).toBe(null);
  expect(media.paused).toBe(true);
  expect(media.ended).toBe(false);
  expect(media.currentTime).toBe(0);
  expect(media.duration).toBeNaN();
  expect(media.src).toBe(defaultSrc);
  expect(media.buffered.length).toBe(0);
  expect(media.played.length).toBeGreaterThanOrEqual(1);
}

interface DeferredSourceContract<Adapter extends IframeAdapter> {
  adapterName: string;
  createAdapter: () => Adapter;
  createIframe: () => HTMLIFrameElement;
  firstSource: string;
  emptySource?: string;
  queuedSource?: string;
  replacementSource: string;
  expectedFirstEmbed: string;
  expectedReplacementEmbed: string;
  flush: () => Promise<void>;
  waitForEngine?: (media: Adapter) => Promise<object>;
  assertBuilt?: (media: Adapter, iframe: HTMLIFrameElement, expectedEmbed: string) => void;
  assertSingleBuild?: (media: Adapter) => void;
  assertDeferredState?: (media: Adapter) => void;
}

/**
 * Exercise source deferral independently of an embed's provider-specific protocol.
 *
 * The adapter name is included in assertion diagnostics so failures remain useful when several packages execute this
 * contract in one CI shard.
 */
export function iframeAdapterDeferredSourceContract<Adapter extends IframeAdapter>(
  options: DeferredSourceContract<Adapter>
): void {
  const {
    adapterName,
    createAdapter,
    createIframe,
    firstSource,
    emptySource = firstSource,
    queuedSource = firstSource,
    replacementSource,
    expectedFirstEmbed,
    expectedReplacementEmbed,
    flush,
    waitForEngine,
    assertBuilt,
    assertSingleBuild,
    assertDeferredState = (media) => expect(media.engine).toBe(null),
  } = options;

  const waitUntilBuilt = async (media: Adapter): Promise<void> => {
    await flush();
    await waitForEngine?.(media);
  };

  describe('deferred source handling', () => {
    it('defers the embed until a source arrives', async () => {
      const media = createAdapter();
      const loadstart = vi.fn();

      media.addEventListener('loadstart', loadstart);

      const iframe = createIframe();

      media.attach(iframe);

      expect(iframe.getAttribute('src'), `${adapterName} should leave a source-less iframe untouched`).toBe(null);
      assertDeferredState(media);
      expect(loadstart).not.toHaveBeenCalled();

      media.src = firstSource;
      await waitUntilBuilt(media);

      expect(iframe.getAttribute('src'), `${adapterName} should build its first embed`).toContain(expectedFirstEmbed);
      expect(loadstart).toHaveBeenCalledTimes(1);
      assertBuilt?.(media, iframe, expectedFirstEmbed);
      media.detach();
    });

    it('defers an iframe rendered with an empty src', async () => {
      const media = createAdapter();
      const iframe = createIframe();

      iframe.setAttribute('src', '');
      media.attach(iframe);

      assertDeferredState(media);

      media.src = emptySource;
      await waitUntilBuilt(media);

      expect(iframe.getAttribute('src'), `${adapterName} should replace an empty src with its embed`).toContain(
        expectedFirstEmbed
      );
      assertBuilt?.(media, iframe, expectedFirstEmbed);
      media.detach();
    });

    it('builds one embed for repeated source changes in the same task', async () => {
      const media = createAdapter();
      const loadstart = vi.fn();
      const iframe = createIframe();

      media.addEventListener('loadstart', loadstart);
      media.attach(iframe);

      media.src = queuedSource;
      media.src = replacementSource;
      await waitUntilBuilt(media);

      expect(iframe.getAttribute('src'), `${adapterName} should build only the latest queued source`).toContain(
        expectedReplacementEmbed
      );
      expect(loadstart).toHaveBeenCalledTimes(1);
      assertBuilt?.(media, iframe, expectedReplacementEmbed);
      assertSingleBuild?.(media);
      media.detach();
    });

    it('does not leave play waiting while the embed has no source', async () => {
      const media = createAdapter();

      media.attach(createIframe());

      await expect(media.play()).resolves.toBeUndefined();
      assertDeferredState(media);
      media.detach();
    });
  });
}
