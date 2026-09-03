import { ContextProvider } from '@videojs/element/context';
import type { Media, TextCueLike, TextTrackLike, TextTrackListLike } from '@videojs/media';
import { afterEach, describe, expect, it } from 'vite-plus/test';

import { UIElement } from '../../ui/ui-element';
import { mediaContext } from '../context';
import { TextTrackController } from '../text-track-controller';

class FakeTextTrack extends EventTarget implements TextTrackLike {
  readonly id = '';
  readonly language = '';
  readonly cues: TextCueLike[] = [];
  readonly activeCues: TextCueLike[] = [];

  mode: TextTrackLike['mode'] = 'disabled';

  constructor(
    readonly kind: string,
    readonly label = ''
  ) {
    super();
  }

  addCue(cue: TextCueLike): void {
    this.cues.push(cue);
  }

  removeCue(cue: TextCueLike): void {
    const index = this.cues.indexOf(cue);

    if (index >= 0) this.cues.splice(index, 1);
  }
}

class FakeTextTrackList extends EventTarget implements TextTrackListLike {
  readonly [index: number]: TextTrackLike;
  readonly #tracks: TextTrackLike[] = [];

  get length(): number {
    return this.#tracks.length;
  }

  add(track: TextTrackLike): void {
    this.#tracks.push(track);
    this.dispatchEvent(new Event('addtrack'));
  }

  remove(track: TextTrackLike): void {
    const index = this.#tracks.indexOf(track);
    if (index < 0) return;

    this.#tracks.splice(index, 1);
    this.dispatchEvent(new Event('removetrack'));
  }

  [Symbol.iterator](): Iterator<TextTrackLike> {
    return this.#tracks[Symbol.iterator]();
  }
}

class FakeMedia extends EventTarget implements Media {
  readonly textTracks = new FakeTextTrackList();

  addTextTrack(kind: TextTrackLike['kind'], label?: string): FakeTextTrack {
    const track = new FakeTextTrack(kind, label);

    this.textTracks.add(track);

    return track;
  }

  removeTextTrack(track: TextTrackLike): void {
    this.textTracks.remove(track);
  }

  play(): Promise<void> {
    return Promise.resolve();
  }
}

class TestMediaProvider extends UIElement {
  readonly #provider = new ContextProvider(this, {
    context: mediaContext,
    initialValue: { media: null, registerMedia: () => () => {} },
  });

  setMedia(media: FakeMedia | null): void {
    this.#provider.setValue({ media, registerMedia: () => () => {} });
  }
}

class CreatedTrackConsumer extends UIElement {
  readonly track = new TextTrackController(this, { kind: 'metadata', label: 'Ads' });
}

class ActiveTrackConsumer extends UIElement {
  readonly track = new TextTrackController(this, 'chapters');
}

customElements.define('test-text-track-provider', TestMediaProvider);
customElements.define('test-created-text-track-consumer', CreatedTrackConsumer);
customElements.define('test-active-text-track-consumer', ActiveTrackConsumer);

afterEach(() => {
  document.body.innerHTML = '';
});

describe('TextTrackController', () => {
  it('owns a created track for the host lifetime', () => {
    const media = new FakeMedia();
    const provider = new TestMediaProvider();
    const consumer = new CreatedTrackConsumer();

    provider.append(consumer);
    document.body.append(provider);
    provider.setMedia(media);

    expect(consumer.track.value).toMatchObject({ kind: 'metadata', label: 'Ads', mode: 'hidden' });
    expect(media.textTracks.length).toBe(1);

    const cue = { startTime: 0, endTime: 1 };

    consumer.track.addCue(cue);

    expect(consumer.track.cues).toEqual([cue]);

    consumer.remove();

    expect(media.textTracks.length).toBe(0);
  });

  it('observes hidden tracks and their active cues', () => {
    const media = new FakeMedia();
    const track = media.addTextTrack('chapters');
    const cue = { startTime: 0, endTime: 1 };

    track.mode = 'hidden';

    const provider = new TestMediaProvider();
    const consumer = new ActiveTrackConsumer();

    provider.append(consumer);
    document.body.append(provider);
    provider.setMedia(media);

    expect(consumer.track.value).toBe(track);

    track.activeCues.push(cue);
    track.dispatchEvent(new Event('cuechange'));

    expect(consumer.track.activeCues).toEqual([cue]);

    track.mode = 'disabled';
    media.textTracks.dispatchEvent(new Event('change'));

    expect(consumer.track.value).toBeNull();
  });
});
