import { remotePlaybackCapability, sourceCapability, streamTypeCapability } from '@videojs/media';
import { describe, expect, it } from 'vite-plus/test';

import { hlsVideoMediaDefaultProps } from '../adapter';
import { deriveMediaDefaultProps } from '../derived-defaults';

describe('deriveMediaDefaultProps', () => {
  it('derives exactly the defaults the hand-written object used to state', () => {
    // hlsVideoMediaDefaultProps is now itself derived from the adapter's declared capabilities; this pins that the
    // derivation reproduces the original literal values, so downstream behavior (React prop-splitting, adapter
    // initial state) is unchanged.
    expect(hlsVideoMediaDefaultProps).toEqual({
      src: '',
      preload: '',
      disableRemotePlayback: false,
      streamType: 'unknown',
    });

    const derived = deriveMediaDefaultProps(
      [sourceCapability, remotePlaybackCapability, streamTypeCapability],
      Object.keys(hlsVideoMediaDefaultProps)
    );

    expect(derived.src).toBe(hlsVideoMediaDefaultProps.src);
    expect(derived.disableRemotePlayback).toBe(hlsVideoMediaDefaultProps.disableRemotePlayback);
    expect(derived.streamType).toBe(hlsVideoMediaDefaultProps.streamType);
  });

  it('pins the drift the adapter-refined descriptor now encodes in one place', () => {
    const derived = deriveMediaDefaultProps([sourceCapability], ['preload']);

    // The canonical descriptor says 'metadata'; this adapter's preload mirrors IDL reflection where '' marks
    // "unset". The deviation used to live silently in the hand-written defaults object; it now lives once, in
    // hlsVideoSourceCapability, and the derived defaults follow it.
    expect(derived.preload).toBe('metadata');
    expect(hlsVideoMediaDefaultProps.preload).toBe('');
  });
});
