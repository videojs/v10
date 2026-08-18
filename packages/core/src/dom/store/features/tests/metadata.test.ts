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
    if (!this.contentData || Object.is(this.contentData.title, value)) return;
    const contentData = { ...this.contentData };
    if (value === undefined) delete contentData.title;
    else contentData.title = value;
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

  it('selects only resolved metadata and public writers', () => {
    const store = createStore<PlayerTarget>()(metadataFeature);

    expect(selectMetadata(store.state)).toEqual({
      contentTitle: '',
      setContentTitle: store.setContentTitle,
      setDefaultContentTitle: store.setDefaultContentTitle,
    });
    expect(store.state).not.toHaveProperty('defaultContentTitle');
  });
});
