import type { MediaContentData, MediaContentValue } from '@videojs/media';
import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../player';
import { selectMetadata } from '../../selectors';
import { metadataFeature } from '../metadata';
import { audioFeatures, backgroundFeatures, liveAudioFeatures, liveVideoFeatures, videoFeatures } from '../presets';

class ContentDataMedia extends EventTarget {
  contentData: MediaContentData | undefined;

  constructor(contentData: MediaContentData | undefined) {
    super();
    this.contentData = contentData;
  }

  setContentTitle(value: MediaContentValue): void {
    this.#setKey('title', value);
  }

  setContentPoster(value: MediaContentValue): void {
    this.#setKey('poster', value);
  }

  #setKey(key: 'title' | 'poster', value: MediaContentValue): void {
    if (!this.contentData || Object.is(this.contentData[key], value)) return;
    const contentData = { ...this.contentData };
    if (value === undefined) delete contentData[key];
    else contentData[key] = value;
    this.contentData = contentData;
    this.dispatchEvent(new Event('contentdatachange'));
  }
}

const target = (media: EventTarget): PlayerTarget => ({
  media: media as PlayerTarget['media'],
  container: null,
});

describe('metadataFeature', () => {
  it('is included in standard media presets but not the empty background preset', () => {
    expect(videoFeatures).toContain(metadataFeature);
    expect(audioFeatures).toContain(metadataFeature);
    expect(liveVideoFeatures).toContain(metadataFeature);
    expect(liveAudioFeatures).toContain(metadataFeature);
    expect(backgroundFeatures).not.toContain(metadataFeature);
  });

  it('resolves user, media, user default, and feature default in order', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);

    expect(store.contentTitle).toBe('');

    store.setDefaultContentTitle('fallback');
    expect(store.contentTitle).toBe('fallback');

    const media = new ContentDataMedia({ title: 'media' });
    store.attach(target(media));
    expect(store.contentTitle).toBe('media');

    store.setContentTitle('user');
    expect(store.contentTitle).toBe('user');

    media.setContentTitle('latest media');
    expect(store.contentTitle).toBe('user');

    store.setContentTitle(null);
    expect(store.contentTitle).toBe('latest media');
  });

  it('treats empty and whitespace-only strings as literal values', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    store.setDefaultContentTitle('fallback');
    store.setContentTitle('');

    expect(store.contentTitle).toBe('');

    store.setContentTitle('   ');
    expect(store.contentTitle).toBe('   ');
  });

  it('subscribes to content data before an asynchronous title arrives', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    store.setDefaultContentTitle('fallback');
    const media = new ContentDataMedia({});
    const addEventListener = vi.spyOn(media, 'addEventListener');

    store.attach(target(media));

    expect(store.contentTitle).toBe('fallback');
    expect(addEventListener).toHaveBeenCalledWith('contentdatachange', expect.any(Function), expect.anything());

    media.setContentTitle('loaded title');
    expect(store.contentTitle).toBe('loaded title');

    media.setContentTitle(null);
    expect(store.contentTitle).toBe('fallback');

    media.setContentTitle('replacement title');
    expect(store.contentTitle).toBe('replacement title');

    media.setContentTitle(undefined);
    expect(store.contentTitle).toBe('fallback');
  });

  it('subscribes when content data initially contains only another field', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    const media = new ContentDataMedia({ poster: 'poster.jpg' });
    const addEventListener = vi.spyOn(media, 'addEventListener');

    store.attach(target(media));

    expect(addEventListener).toHaveBeenCalledWith('contentdatachange', expect.any(Function), expect.anything());

    media.setContentTitle('later title');
    expect(store.contentTitle).toBe('later title');
  });

  it('does not listen to unsupported media', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    store.setDefaultContentTitle('fallback');
    const unsupported = new ContentDataMedia(undefined);
    const addEventListener = vi.spyOn(unsupported, 'addEventListener');

    store.attach(target(unsupported));

    expect(store.contentTitle).toBe('fallback');
    expect(addEventListener).not.toHaveBeenCalledWith('contentdatachange', expect.anything());
  });

  it('resets media metadata on detach while preserving user-owned state', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    store.setDefaultContentTitle('fallback');
    const detach = store.attach(target(new ContentDataMedia({ title: 'media' })));

    detach();

    expect(store.contentTitle).toBe('fallback');
  });

  it('resolves the content poster through the same order as the title', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);

    expect(store.poster).toBe('');

    store.setDefaultPoster('fallback.jpg');
    expect(store.poster).toBe('fallback.jpg');

    const media = new ContentDataMedia({ poster: 'media.jpg' });
    store.attach(target(media));
    expect(store.poster).toBe('media.jpg');

    store.setPoster('user.jpg');
    expect(store.poster).toBe('user.jpg');

    media.setContentPoster('latest-media.jpg');
    expect(store.poster).toBe('user.jpg');

    store.setPoster(null);
    expect(store.poster).toBe('latest-media.jpg');

    media.setContentPoster(undefined);
    expect(store.poster).toBe('fallback.jpg');
  });

  it('resolves title and poster independently from one bag', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    const media = new ContentDataMedia({ title: 'media title' });
    store.attach(target(media));

    expect(store.contentTitle).toBe('media title');
    expect(store.poster).toBe('');

    media.setContentPoster('media.jpg');

    expect(store.contentTitle).toBe('media title');
    expect(store.poster).toBe('media.jpg');
  });

  it('resets both media-owned values on detach while preserving user-owned state', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);
    store.setDefaultPoster('fallback.jpg');
    const detach = store.attach(target(new ContentDataMedia({ title: 'media', poster: 'media.jpg' })));

    detach();

    expect(store.contentTitle).toBe('');
    expect(store.poster).toBe('fallback.jpg');
  });

  it('selects only resolved metadata and public writers', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);

    expect(selectMetadata(store.state)).toEqual({
      contentTitle: '',
      poster: '',
      setContentTitle: store.setContentTitle,
      setDefaultContentTitle: store.setDefaultContentTitle,
      setPoster: store.setPoster,
      setDefaultPoster: store.setDefaultPoster,
    });
    expect(store.state).not.toHaveProperty('defaultContentTitle');
    expect(store.state).not.toHaveProperty('defaultPoster');
  });
});
