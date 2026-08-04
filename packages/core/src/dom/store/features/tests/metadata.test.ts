import type { MediaContentValue } from '@videojs/media';
import { createStore } from '@videojs/store';
import { describe, expect, it, vi } from 'vitest';
import type { PlayerTarget } from '../../../player';
import { selectMetadata } from '../../selectors';
import { metadataFeature } from '../metadata';
import { audioFeatures, backgroundFeatures, liveAudioFeatures, liveVideoFeatures, videoFeatures } from '../presets';

class ContentTitleMedia extends EventTarget {
  constructor(public contentTitle: MediaContentValue) {
    super();
  }

  setContentTitle(value: string | null): void {
    if (Object.is(this.contentTitle, value)) return;
    this.contentTitle = value;
    this.dispatchEvent(new Event('contenttitlechange'));
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

    const media = new ContentTitleMedia('media');
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
    const store = createStore<PlayerTarget>()(metadataFeature, {
      config: { contentTitle: '', defaultContentTitle: 'fallback' },
    });

    expect(store.contentTitle).toBe('');

    store.setContentTitle('   ');
    expect(store.contentTitle).toBe('   ');
  });

  it('supports a capable media reporting null and synchronizes its change event', () => {
    const store = createStore<PlayerTarget>()(metadataFeature, {
      config: { defaultContentTitle: 'fallback' },
    });
    const media = new ContentTitleMedia(null);
    const addEventListener = vi.spyOn(media, 'addEventListener');

    store.attach(target(media));

    expect(store.contentTitle).toBe('fallback');
    expect(addEventListener).toHaveBeenCalledWith('contenttitlechange', expect.any(Function), expect.anything());

    media.setContentTitle('loaded title');
    expect(store.contentTitle).toBe('loaded title');
  });

  it('does not listen to unsupported media', () => {
    const store = createStore<PlayerTarget>()(metadataFeature, {
      config: { defaultContentTitle: 'fallback' },
    });
    const unsupported = new EventTarget();
    const addEventListener = vi.spyOn(unsupported, 'addEventListener');

    store.attach(target(unsupported));

    expect(store.contentTitle).toBe('fallback');
    expect(addEventListener).not.toHaveBeenCalledWith('contenttitlechange', expect.anything());
  });

  it('resets media metadata on detach while preserving provider config', () => {
    const store = createStore<PlayerTarget>()(metadataFeature, {
      config: { defaultContentTitle: 'fallback' },
    });
    const detach = store.attach(target(new ContentTitleMedia('media')));

    detach();

    expect(store.contentTitle).toBe('fallback');
    expect(store.$config.get().defaultContentTitle).toBe('fallback');
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
