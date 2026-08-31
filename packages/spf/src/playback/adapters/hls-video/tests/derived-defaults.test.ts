import { remotePlaybackCapability, sourceCapability, streamTypeCapability } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { hlsVideoMediaDefaultProps } from '../adapter';
import { deriveMediaDefaultProps } from '../derived-defaults';

describe('deriveMediaDefaultProps', () => {
  it('derives the media prop defaults hlsVideoMediaDefaultProps hand-maintains', () => {
    const derived = deriveMediaDefaultProps(
      [sourceCapability, remotePlaybackCapability, streamTypeCapability],
      Object.keys(hlsVideoMediaDefaultProps)
    );

    expect(derived.src).toBe(hlsVideoMediaDefaultProps.src);
    expect(derived.disableRemotePlayback).toBe(hlsVideoMediaDefaultProps.disableRemotePlayback);
    expect(derived.streamType).toBe(hlsVideoMediaDefaultProps.streamType);
  });

  it('pins the drift derivation would have prevented: preload has two disagreeing defaults today', () => {
    const derived = deriveMediaDefaultProps([sourceCapability], ['preload']);

    // The descriptor says 'metadata'; the hand-written React default says ''. Same prop, two sources of truth,
    // already diverged — the exhibit for deriving *MediaDefaultProps from declared capabilities instead.
    expect(derived.preload).toBe('metadata');
    expect(hlsVideoMediaDefaultProps.preload).toBe('');
  });
});
