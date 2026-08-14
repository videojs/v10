import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaError } from '../../../core/media-error';
import { isMediaMutedCapable, isMediaVolumeCapable } from '../../../core/predicate';
import type { Video } from '../../../core/types';
import { buildTikTokIframeSrc, parseTikTokSource, parseTikTokVideoId, TikTokMedia, tiktokMediaDefaultProps } from '..';

// https://developers.tiktok.com/doc/embed-player
const STATE = { INIT: -1, ENDED: 0, PLAYING: 1, PAUSED: 2, BUFFERING: 3 } as const;

const VIDEO_ID = '7273420104193772846';
const OTHER_VIDEO_ID = '7268615078845893934';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

/** jsdom only gives a connected iframe the window the embed posts from. */
function createIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  return iframe;
}

/** An iframe as React renders it before a source resolves: `src` present but empty. */
function createEmptySrcIframe(): HTMLIFrameElement {
  const iframe = createIframe();
  iframe.setAttribute('src', '');
  return iframe;
}

function frameOf(iframe: HTMLIFrameElement): Window {
  const frame = iframe.contentWindow;
  if (!frame) throw new Error('iframe has no window');
  return frame;
}

/** Spy on the commands posted to the embed. */
function watchCommands(iframe: HTMLIFrameElement) {
  return vi.spyOn(frameOf(iframe), 'postMessage');
}

/** Report a message the way the embed does: on `window`, from the embed's frame. */
function report(iframe: HTMLIFrameElement, type: string, value?: unknown): void {
  globalThis.dispatchEvent(
    new MessageEvent('message', {
      data: { 'x-tiktok-player': true, type, ...(value !== undefined && { value }) },
      source: frameOf(iframe),
    })
  );
}

/** Flush the microtask a load waits on before the embed is built. */
async function flushLoad(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

async function attachAndLoad(
  media: TikTokMedia
): Promise<{ iframe: HTMLIFrameElement; commands: ReturnType<typeof watchCommands> }> {
  // There is no embed to attach to without a source, so tests that don't care
  // which video is playing get one.
  if (!media.src) media.src = VIDEO_ID;
  const iframe = createIframe();
  media.attach(iframe);
  const commands = watchCommands(iframe);
  report(iframe, 'onPlayerReady');
  return { iframe, commands };
}

describe('parseTikTokVideoId', () => {
  it('extracts id from a raw numeric id', () => {
    expect(parseTikTokVideoId(VIDEO_ID)).toBe(VIDEO_ID);
  });

  it('extracts id from an embed player URL', () => {
    expect(parseTikTokVideoId(`https://www.tiktok.com/player/v1/${VIDEO_ID}?controls=0`)).toBe(VIDEO_ID);
  });

  it('extracts id from a share link', () => {
    expect(parseTikTokVideoId(`https://www.tiktok.com/share/video/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('extracts id from an author URL', () => {
    expect(parseTikTokVideoId(`https://www.tiktok.com/@videojs/video/${VIDEO_ID}`)).toBe(VIDEO_ID);
  });

  it('returns null for empty input', () => {
    expect(parseTikTokVideoId('')).toBe(null);
  });

  it('returns null for non-TikTok URLs', () => {
    expect(parseTikTokVideoId('https://example.com/video/123')).toBe(null);
  });

  it('returns null for a TikTok URL that names no video', () => {
    expect(parseTikTokVideoId('https://www.tiktok.com/@videojs')).toBe(null);
  });
});

describe('parseTikTokSource', () => {
  it('parses the video id out of every recognized form', () => {
    expect(parseTikTokSource(VIDEO_ID)).toEqual({ id: VIDEO_ID });
    expect(parseTikTokSource(`https://www.tiktok.com/player/v1/${VIDEO_ID}`)).toEqual({ id: VIDEO_ID });
    expect(parseTikTokSource(`https://www.tiktok.com/share/video/${VIDEO_ID}/`)).toEqual({ id: VIDEO_ID });
    expect(parseTikTokSource(`https://www.tiktok.com/@user.name/video/${VIDEO_ID}?is_from_webapp=1`)).toEqual({
      id: VIDEO_ID,
    });
  });

  it('returns null for an id that is not numeric', () => {
    expect(parseTikTokSource('aqz-KE-bpKQ')).toBe(null);
  });
});

describe('buildTikTokIframeSrc', () => {
  it('builds the embed URL with hidden controls and related videos kept to the author', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID);
    expect(src).toContain(`https://www.tiktok.com/player/v1/${VIDEO_ID}?`);
    expect(src).toContain('controls=0');
    expect(src).toContain('rel=0');
  });

  it('encodes autoplay, defaultMuted, and loop', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, { autoplay: true, defaultMuted: true, loop: true });
    expect(src).toContain('autoplay=1');
    expect(src).toContain('muted=1');
    expect(src).toContain('loop=1');
  });

  it('leaves autoplay, muted, and loop out rather than turning them off', () => {
    // Off is the player's default for all three, so the URL this builds for a
    // plain source is the one upstream's element builds, parameter for parameter.
    const src = buildTikTokIframeSrc(VIDEO_ID, { autoplay: false, defaultMuted: false, loop: false });
    expect(src).toBe(`https://www.tiktok.com/player/v1/${VIDEO_ID}?controls=0&rel=0`);
    expect(buildTikTokIframeSrc(VIDEO_ID, tiktokMediaDefaultProps)).toBe(
      `https://www.tiktok.com/player/v1/${VIDEO_ID}?controls=0&rel=0`
    );
  });

  it('shows TikTok controls when controls=true', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, { controls: true });
    expect(src).not.toContain('controls=');
  });

  it('serializes TikTok player parameters verbatim', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, {
      source: {
        engine: {
          tiktok: {
            closed_caption: 0,
            description: 0,
            fullscreen_button: 0,
            music_info: 1,
            native_context_menu: 1,
            play_button: 0,
            progress_bar: 0,
            timestamp: 0,
            volume_control: 0,
          },
        },
      },
    });
    expect(src).toContain('closed_caption=0');
    expect(src).toContain('description=0');
    expect(src).toContain('fullscreen_button=0');
    expect(src).toContain('music_info=1');
    expect(src).toContain('native_context_menu=1');
    expect(src).toContain('play_button=0');
    expect(src).toContain('progress_bar=0');
    expect(src).toContain('timestamp=0');
    expect(src).toContain('volume_control=0');
  });

  it('carries undeclared TikTok player parameters through', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, { source: { engine: { tiktok: { some_future_param: 'yes' } } } });
    expect(src).toContain('some_future_param=yes');
  });

  it('lets TikTok player parameters override the defaults the host sets', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, { source: { engine: { tiktok: { rel: 1 } } } });
    expect(src).toContain('rel=1');
  });

  it('keeps referrerPolicy off the URL', () => {
    const src = buildTikTokIframeSrc(VIDEO_ID, {
      source: { engine: { tiktok: { referrerPolicy: 'no-referrer' } } },
    });
    expect(src).not.toContain('referrerPolicy');
  });

  it('returns empty string for invalid src', () => {
    expect(buildTikTokIframeSrc('https://example.com/not-a-tiktok-url')).toBe('');
    expect(buildTikTokIframeSrc('')).toBe('');
  });
});

describe('TikTokMedia', () => {
  it('has expected default state before attach', () => {
    const media = new TikTokMedia();
    expect(media.engine).toBe(null);
    expect(media.target).toBe(null);
    expect(media.paused).toBe(true);
    expect(media.ended).toBe(false);
    expect(media.currentTime).toBe(0);
    expect(media.duration).toBeNaN();
    expect(media.src).toBe(tiktokMediaDefaultProps.src);
    expect(media.buffered.length).toBe(0);
    expect(media.played.length).toBeGreaterThanOrEqual(1);
  });

  it('sets the initial iframe src when attached', () => {
    const media = new TikTokMedia();
    media.src = `https://www.tiktok.com/@videojs/video/${VIDEO_ID}`;
    const iframe = createIframe();
    media.attach(iframe);

    expect(iframe.getAttribute('src')).toContain(`https://www.tiktok.com/player/v1/${VIDEO_ID}`);
    expect(media.currentSrc).toBe(iframe.getAttribute('src'));
    expect(media.target).toBe(iframe);
    expect(media.engine).toBe(iframe.contentWindow);
    media.detach();
  });

  it('defers the embed until a source arrives', async () => {
    const media = new TikTokMedia();
    const loadstart = vi.fn();
    media.addEventListener('loadstart', loadstart);

    // How every framework builds the element: created first, `src` set after.
    const iframe = createIframe();
    media.attach(iframe);
    expect(iframe.getAttribute('src')).toBe(null);
    expect(loadstart).not.toHaveBeenCalled();

    media.src = VIDEO_ID;
    await flushLoad();

    expect(iframe.getAttribute('src')).toContain(`https://www.tiktok.com/player/v1/${VIDEO_ID}`);
    expect(loadstart).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('defers the embed for an iframe rendered with an empty src', async () => {
    const media = new TikTokMedia();
    // React renders `src=""` before a source resolves. The `src` property reports
    // the document URL for it, so only the attribute says there is no embed.
    const iframe = createEmptySrcIframe();
    media.attach(iframe);
    expect(media.currentSrc).toBe('');

    media.src = VIDEO_ID;
    await flushLoad();

    expect(iframe.getAttribute('src')).toContain(`https://www.tiktok.com/player/v1/${VIDEO_ID}`);
    media.detach();
  });

  it('builds a deferred embed once for repeated source changes in the same task', async () => {
    const media = new TikTokMedia();
    const iframe = createIframe();
    media.attach(iframe);

    media.src = VIDEO_ID;
    media.src = OTHER_VIDEO_ID;
    await flushLoad();

    expect(iframe.getAttribute('src')).toContain(`https://www.tiktok.com/player/v1/${OTHER_VIDEO_ID}`);
    media.detach();
  });

  it('does not leave play() waiting while the embed is deferred', async () => {
    const media = new TikTokMedia();
    media.attach(createIframe());

    // No embed means no `onPlayerReady` is coming to report a load; waiting would hang.
    await expect(media.play()).resolves.toBeUndefined();
  });

  it('waits for a deferred embed to be ready before playing', async () => {
    const media = new TikTokMedia();
    const iframe = createIframe();
    media.attach(iframe);

    media.src = VIDEO_ID;
    let played = false;
    const pending = media.play().then(() => {
      played = true;
    });

    await flushLoad();
    await pending;
    // Building the embed navigates the frame, so the commands it takes are the
    // ones posted to the window it has now.
    const commands = watchCommands(iframe);
    // Play does not wait on the embed: it reports nothing until it is ready, so
    // a barrier only its own report can settle would strand the request.
    expect(played).toBe(true);

    // The command is replayed at the first moment the embed can take one, so a
    // play asked for before that still starts the video.
    report(iframe, 'onPlayerReady');

    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'play' }, '*');
    media.detach();
  });

  it('does not replay a play the listener took back before the embed was ready', async () => {
    const media = new TikTokMedia();
    const iframe = createIframe();
    media.attach(iframe);

    media.src = VIDEO_ID;
    await media.play();
    media.pause();
    await flushLoad();

    const commands = watchCommands(iframe);
    report(iframe, 'onPlayerReady');

    expect(commands).not.toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'play' }, '*');
    media.detach();
  });

  it('emits loadstart on attach and loadedmetadata/loadcomplete once the embed is ready', async () => {
    const media = new TikTokMedia();
    const events: string[] = [];
    for (const type of ['loadstart', 'loadedmetadata', 'loadcomplete'] as const) {
      media.addEventListener(type, () => events.push(type));
    }

    await attachAndLoad(media);

    expect(events).toEqual(['loadstart', 'loadedmetadata', 'loadcomplete']);
    expect(media.readyState).toBe(1);
    media.detach();
  });

  it('updates state from player state changes', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);

    const playSpy = vi.fn();
    const waitingSpy = vi.fn();
    media.addEventListener('play', playSpy);
    media.addEventListener('waiting', waitingSpy);

    report(iframe, 'onStateChange', STATE.BUFFERING);
    expect(playSpy).toHaveBeenCalledTimes(1);
    expect(waitingSpy).toHaveBeenCalledTimes(1);
    expect(media.paused).toBe(false);

    report(iframe, 'onStateChange', STATE.PLAYING);
    expect(media.paused).toBe(false);
    expect(media.readyState).toBe(3);
    // play only fires once per playback start
    expect(playSpy).toHaveBeenCalledTimes(1);

    report(iframe, 'onStateChange', STATE.PAUSED);
    expect(media.paused).toBe(true);

    report(iframe, 'onStateChange', STATE.PLAYING);
    expect(playSpy).toHaveBeenCalledTimes(2);

    report(iframe, 'onStateChange', STATE.ENDED);
    expect(media.ended).toBe(true);
    expect(media.paused).toBe(true);

    report(iframe, 'onStateChange', STATE.INIT);
    expect(media.paused).toBe(true);
    media.detach();
  });

  it('reports progress, duration, and seeks from the embed', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const events: string[] = [];
    for (const type of ['timeupdate', 'durationchange', 'seeking', 'seeked'] as const) {
      media.addEventListener(type, () => events.push(type));
    }

    report(iframe, 'onCurrentTime', { currentTime: 2.5, duration: 15 });
    expect(media.currentTime).toBe(2.5);
    expect(media.duration).toBe(15);
    expect(events).toEqual(['timeupdate', 'durationchange']);
    // Only a position is reported, so what has played is all that is known to be
    // buffered.
    expect(media.buffered.length).toBe(1);
    expect(media.buffered.end(0)).toBe(2.5);
    expect(media.seekable.end(0)).toBe(15);

    // A duration that has not changed is not announced again.
    report(iframe, 'onCurrentTime', { currentTime: 3, duration: 15 });
    expect(events).toEqual(['timeupdate', 'durationchange', 'timeupdate']);
    media.detach();
  });

  it('reports mute changes from the embed', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const volumechange = vi.fn();
    media.addEventListener('volumechange', volumechange);

    report(iframe, 'onMute', true);
    expect(media.muted).toBe(true);

    report(iframe, 'onMute', false);
    expect(media.muted).toBe(false);

    // The level the embed reports goes nowhere: there is no volume to write, so
    // nothing announces one changing.
    report(iframe, 'onVolumeChange', 25);
    expect(volumechange).toHaveBeenCalledTimes(2);
    media.detach();
  });

  it('builds the embed with the mute the host is already reporting', () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    media.muted = true;
    const iframe = createIframe();
    media.attach(iframe);

    // The frame reads mute once, out of the URL it is built with.
    expect(iframe.getAttribute('src')).toContain('muted=1');
    expect(media.muted).toBe(true);
    media.detach();
  });

  it('reports the mute the embed is built with from defaultMuted', () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    media.defaultMuted = true;
    const iframe = createIframe();
    media.attach(iframe);

    expect(iframe.getAttribute('src')).toContain('muted=1');
    // A media element comes up muted when it was created muted, rather than
    // waiting for the embed to say so.
    expect(media.muted).toBe(true);

    const commands = watchCommands(iframe);
    report(iframe, 'onPlayerReady');

    // The URL parameter is not always honored, so the mute is asserted again
    // over the protocol.
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'mute' }, '*');
    media.detach();
  });

  it('leaves the mute the embed reports alone once it is loaded', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    report(iframe, 'onMute', false);

    // `defaultMuted` seeds the embed that gets built; it does not talk over one
    // that is already reporting for itself.
    media.defaultMuted = true;

    expect(media.muted).toBe(false);
    media.detach();
  });

  it('carries a mute onto the embed it rebuilds', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe } = await attachAndLoad(media);
    // Where `<tiktok-video muted>` lands: the attribute reaches `muted`, and the
    // `src` sync behind it rebuilds the frame.
    media.muted = true;

    media.src = OTHER_VIDEO_ID;
    await flushLoad();

    expect(iframe.getAttribute('src')).toContain('muted=1');
    expect(media.muted).toBe(true);

    // Building the embed navigates the frame, so the commands it takes are the
    // ones posted to the window it has now.
    const commands = watchCommands(iframe);
    report(iframe, 'onPlayerReady');

    // The URL parameter is not always honored, so the mute is asserted again
    // over the protocol.
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'mute' }, '*');
    media.detach();
  });

  it('offers no volume surface but keeps mute', () => {
    // The embed reports a level but takes no command to set one, so the member is
    // absent rather than read-only — the player would render a slider that cannot
    // move. `mute` and `unMute` are commands it does take, so mute stays.
    const media = new TikTokMedia() as Partial<Video>;
    expect(media.volume).toBeUndefined();
    expect(media.muted).toBeDefined();
    expect(isMediaVolumeCapable(media)).toBe(false);
    expect(isMediaMutedCapable(media)).toBe(true);
  });

  it('posts play, pause, seekTo, and mute commands to the embed', async () => {
    const media = new TikTokMedia();
    const { commands } = await attachAndLoad(media);

    await media.play();
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'play' }, '*');

    media.pause();
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'pause' }, '*');

    media.currentTime = 30;
    media.muted = true;
    // Commands defer via the loadComplete microtask — flush.
    await flushLoad();

    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'seekTo', value: 30 }, '*');
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'mute' }, '*');

    media.muted = false;
    await flushLoad();
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'unMute' }, '*');
    media.detach();
  });

  it('completes a seek on the position the embed reports next', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const seeking = vi.fn();
    const seeked = vi.fn();
    media.addEventListener('seeking', seeking);
    media.addEventListener('seeked', seeked);

    media.currentTime = 30;
    expect(media.seeking).toBe(true);
    expect(seeking).toHaveBeenCalledTimes(1);
    // The requested position is reported right away; the embed only reports one
    // every so often.
    expect(media.currentTime).toBe(30);

    report(iframe, 'onCurrentTime', { currentTime: 30.2, duration: 60 });
    expect(media.seeking).toBe(false);
    expect(seeked).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('completes a seek that lands on exactly the position asked for', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const seeked = vi.fn();
    media.addEventListener('seeked', seeked);

    media.currentTime = 30;
    // Landing on the requested position is the ordinary outcome, and while paused
    // no other one may ever be reported.
    report(iframe, 'onCurrentTime', { currentTime: 30, duration: 60 });

    expect(media.seeking).toBe(false);
    expect(seeked).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('does not report the embed emptied for a video it holds but has not started', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const emptied = vi.fn();
    media.addEventListener('emptied', emptied);

    report(iframe, 'onCurrentTime', { currentTime: 5, duration: 15 });
    report(iframe, 'onStateChange', STATE.INIT);

    // The resource is still loaded, so nothing was discarded to announce.
    expect(emptied).not.toHaveBeenCalled();
    expect(media.paused).toBe(true);
    media.detach();
  });

  it('replays on ended when loop is set', async () => {
    const media = new TikTokMedia();
    media.loop = true;
    const { iframe, commands } = await attachAndLoad(media);

    report(iframe, 'onStateChange', STATE.ENDED);
    await flushLoad();

    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'play' }, '*');
    media.detach();
  });

  it('rewrites the iframe src when the source changes', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe } = await attachAndLoad(media);
    report(iframe, 'onCurrentTime', { currentTime: 5, duration: 15 });

    media.src = OTHER_VIDEO_ID;
    await flushLoad();

    // The protocol has nothing that swaps the video, so the frame is rebuilt.
    expect(iframe.getAttribute('src')).toContain(`https://www.tiktok.com/player/v1/${OTHER_VIDEO_ID}`);
    expect(media.currentTime).toBe(0);
    expect(media.duration).toBeNaN();
    expect(media.readyState).toBe(0);

    // The new frame reports itself ready, which completes the load.
    const loadcomplete = vi.fn();
    media.addEventListener('loadcomplete', loadcomplete);
    report(iframe, 'onPlayerReady');
    expect(loadcomplete).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('leaves a frame that already shows the embed alone', async () => {
    const media = new TikTokMedia();
    const iframe = createIframe();
    // What a server-rendered element hands over: the URL these props build.
    const embedSrc = buildTikTokIframeSrc(VIDEO_ID, tiktokMediaDefaultProps);
    iframe.setAttribute('src', embedSrc);
    media.attach(iframe);
    report(iframe, 'onPlayerReady');

    media.src = VIDEO_ID;
    await flushLoad();

    // Rewriting the same URL would reload the frame and lose its position.
    expect(iframe.getAttribute('src')).toBe(embedSrc);
    // No second `onPlayerReady` is coming, so the load has to settle itself.
    await expect(media.play()).resolves.toBeUndefined();
    media.detach();
  });

  it('waits for a frame that is still fetching the embed it already points at', async () => {
    const media = new TikTokMedia();
    const iframe = createIframe();
    // What a server-rendered element hands over, before its embed reports ready.
    iframe.setAttribute('src', buildTikTokIframeSrc(VIDEO_ID, tiktokMediaDefaultProps));
    media.attach(iframe);
    const events: string[] = [];
    for (const type of ['emptied', 'loadstart'] as const) {
      media.addEventListener(type, () => events.push(type));
    }

    // The upgrade path: `src` syncs onto a frame already fetching that embed.
    media.src = VIDEO_ID;
    let played = false;
    const pending = media.play().then(() => {
      played = true;
    });
    await flushLoad();

    // Nothing was discarded and nothing restarted, so the load the frame began is
    // still the one running.
    expect(events).toEqual([]);

    await pending;
    expect(played).toBe(true);

    report(iframe, 'onPlayerReady');
    media.detach();
  });

  it('completes the load on whatever the embed reports first', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const iframe = createIframe();
    media.attach(iframe);
    const loadComplete = vi.fn();
    media.addEventListener('loadcomplete', loadComplete);
    await flushLoad();

    // `onPlayerReady` is not reliably the first thing the embed sends, and it
    // says nothing at all before it is ready — so anything it reports settles the
    // load rather than leaving it open forever.
    report(iframe, 'onStateChange', STATE.PAUSED);

    expect(loadComplete).toHaveBeenCalledTimes(1);
    expect(media.readyState).toBeGreaterThanOrEqual(1);
    media.detach();
  });

  it('errors and unblocks pending play() when src is unrecognized', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe } = await attachAndLoad(media);
    const errorSpy = vi.fn();
    media.addEventListener('error', errorSpy);

    media.src = 'https://example.com/not-a-tiktok-url';
    await flushLoad();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(media.error).toBeInstanceOf(MediaError);
    expect(media.error?.code).toBe(MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED);
    expect(iframe.getAttribute('src')).toContain(VIDEO_ID);
    await expect(media.play()).resolves.toBeUndefined();
    media.detach();
  });

  it('stops the embed and ignores what it reports when src is unrecognized', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe, commands } = await attachAndLoad(media);
    report(iframe, 'onStateChange', STATE.PLAYING);

    media.src = 'https://example.com/not-a-tiktok-url';
    await flushLoad();

    // There is no video to swap the frame to, so the embed it still holds is
    // paused rather than left playing under the error.
    expect(commands).toHaveBeenCalledWith({ 'x-tiktok-player': true, type: 'pause' }, '*');

    commands.mockClear();
    report(iframe, 'onCurrentTime', { currentTime: 5, duration: 15 });
    report(iframe, 'onStateChange', STATE.PLAYING);

    // What the old embed reports is no longer ours to report or to resume.
    expect(media.currentTime).toBe(0);
    expect(media.duration).toBeNaN();
    expect(media.paused).toBe(true);
    expect(media.readyState).toBe(0);
    await media.play();
    expect(commands).not.toHaveBeenCalled();
    media.detach();
  });

  it('surfaces player errors', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const errorSpy = vi.fn();
    media.addEventListener('error', errorSpy);

    report(iframe, 'onError');

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(media.error).toMatchObject({ code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, fatal: true });
    await expect(media.play()).resolves.toBeUndefined();
    media.detach();
  });

  it('surfaces the player errors the embed reports today', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const errorSpy = vi.fn();
    media.addEventListener('error', errorSpy);

    report(iframe, 'onPlayerError', { errorCode: 1001, errorType: 'INVALID_VIDEO' });

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(media.error).toMatchObject({ code: MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED, fatal: true });
    expect(media.error?.message).toContain('INVALID_VIDEO');
    await expect(media.play()).resolves.toBeUndefined();
    media.detach();
  });

  it('reads a player error by the category its code falls in', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);

    report(iframe, 'onPlayerError', { errorCode: 2001, errorType: 'SERVER_ERROR' });
    expect(media.error?.code).toBe(MediaError.MEDIA_ERR_NETWORK);

    report(iframe, 'onPlayerError', { errorCode: 3001, errorType: 'PLAYBACK_ERROR' });
    expect(media.error?.code).toBe(MediaError.MEDIA_ERR_DECODE);
    media.detach();
  });

  it('does not report a blocked autoplay as an error', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const errorSpy = vi.fn();
    media.addEventListener('error', errorSpy);

    report(iframe, 'onPlayerError', { errorCode: 3002, errorType: 'AUTOPLAY_ERROR' });

    // The video is loaded and still playable, so nothing is wrong with it.
    expect(errorSpy).not.toHaveBeenCalled();
    expect(media.error).toBe(null);
    media.detach();
  });

  it('takes the code the deprecated onError carries', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);

    // Its value is a `MediaError` code, unlike the TikTok codes `onPlayerError`
    // reports.
    report(iframe, 'onError', MediaError.MEDIA_ERR_NETWORK);

    expect(media.error?.code).toBe(MediaError.MEDIA_ERR_NETWORK);
    media.detach();
  });

  it('ignores messages from another window and messages that are not the embed protocol', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const foreign = createIframe();

    report(foreign, 'onStateChange', STATE.PLAYING);
    globalThis.dispatchEvent(
      new MessageEvent('message', { data: { type: 'onStateChange', value: STATE.PLAYING }, source: frameOf(iframe) })
    );
    globalThis.dispatchEvent(new MessageEvent('message', { data: 'hello', source: frameOf(iframe) }));

    expect(media.paused).toBe(true);
    media.detach();
  });

  it('warns about messages it does not handle', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);

    report(iframe, 'onSomethingNew', 1);

    expect(warn).toHaveBeenCalledTimes(1);
    media.detach();
  });

  it('stops listening for the embed on detach', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);
    const listeners = vi.spyOn(globalThis, 'addEventListener');

    media.detach();
    expect(media.target).toBe(null);
    expect(media.engine).toBe(null);

    // The listener lives on `window`, so nothing else would ever remove it.
    report(iframe, 'onStateChange', STATE.PLAYING);
    report(iframe, 'onCurrentTime', { currentTime: 9, duration: 15 });

    expect(media.paused).toBe(true);
    expect(media.currentTime).toBe(0);
    expect(listeners).not.toHaveBeenCalled();
  });

  it('ignores what a superseded frame reports', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe: stale } = await attachAndLoad(media);
    media.detach();
    const { iframe: current } = await attachAndLoad(media);
    expect(current).not.toBe(stale);

    report(stale, 'onStateChange', STATE.PLAYING);
    report(stale, 'onMute', true);

    expect(media.paused).toBe(true);
    expect(media.muted).toBe(false);
    media.detach();
  });

  it('unblocks pending play() when detached before the embed is ready', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const iframe = createIframe();
    media.attach(iframe);

    const pending = media.play();
    media.detach();

    await expect(pending).resolves.toBeUndefined();
  });

  it('tracks played ranges via the played-ranges mixin', async () => {
    const media = new TikTokMedia();
    const { iframe } = await attachAndLoad(media);

    report(iframe, 'onStateChange', STATE.PLAYING);
    report(iframe, 'onCurrentTime', { currentTime: 0.08, duration: 15 });
    report(iframe, 'onCurrentTime', { currentTime: 0.16, duration: 15 });
    report(iframe, 'onStateChange', STATE.PAUSED);

    const played = media.played;
    expect(played.length).toBe(1);
    expect(played.start(0)).toBe(0);
    expect(played.end(0)).toBe(0.16);
    media.detach();
  });

  it('does not report fullscreen when there is no element to request it on', async () => {
    const media = new TikTokMedia();

    await media.requestFullscreen();

    expect(media.isFullscreen).toBe(false);
  });
});

describe('TikTokMedia source', () => {
  it('derives src from a structured source and announces the change', () => {
    const media = new TikTokMedia();
    const sourceChange = vi.fn();
    media.addEventListener('sourcechange', sourceChange);

    media.source = { src: `https://www.tiktok.com/@videojs/video/${VIDEO_ID}` };

    expect(media.src).toBe(`https://www.tiktok.com/@videojs/video/${VIDEO_ID}`);
    expect(sourceChange).toHaveBeenCalledTimes(1);
  });

  it('re-derives source from src, carrying TikTok player parameters over', () => {
    const media = new TikTokMedia();
    media.source = { src: VIDEO_ID, engine: { tiktok: { description: 0 } } };

    media.src = OTHER_VIDEO_ID;

    expect(media.source).toEqual({ engine: { tiktok: { description: 0 } }, src: OTHER_VIDEO_ID });
  });

  it('rebuilds the embed when only TikTok player parameters change', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe } = await attachAndLoad(media);

    media.source = { src: VIDEO_ID, engine: { tiktok: { music_info: 0 } } };
    await flushLoad();

    // The player reads its parameters once, when the frame loads.
    expect(iframe.getAttribute('src')).toContain('music_info=0');
    media.detach();
  });

  it('serializes TikTok player parameters onto the initial iframe src', () => {
    const media = new TikTokMedia();
    media.source = { src: VIDEO_ID, engine: { tiktok: { timestamp: 0 } } };
    const iframe = createIframe();
    media.attach(iframe);

    expect(iframe.getAttribute('src')).toContain('timestamp=0');
    media.detach();
  });

  it('clears src when the source is set to null', () => {
    const media = new TikTokMedia();
    media.source = { src: VIDEO_ID };

    media.source = null;

    expect(media.src).toBe('');
    expect(media.source).toBe(null);
  });

  it('drops the embed and resets state when the source is cleared', async () => {
    const media = new TikTokMedia();
    media.src = VIDEO_ID;
    const { iframe, commands } = await attachAndLoad(media);
    report(iframe, 'onStateChange', STATE.PLAYING);
    report(iframe, 'onCurrentTime', { currentTime: 5, duration: 15 });

    media.source = null;
    await flushLoad();

    // Left in place the embed keeps playing and reports state straight back.
    expect(iframe.getAttribute('src')).toBe(null);
    expect(media.duration).toBeNaN();
    expect(media.currentTime).toBe(0);
    expect(media.paused).toBe(true);
    await expect(media.play()).resolves.toBeUndefined();
    expect(commands).not.toHaveBeenCalled();
    media.detach();
  });
});
