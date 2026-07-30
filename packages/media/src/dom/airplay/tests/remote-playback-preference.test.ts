import { describe, expect, it } from 'vitest';
import type { HTMLMediaTargetLike } from '../../media-host';
import { RemotePlaybackPreference } from '../remote-playback-preference';

function createTarget(disableRemotePlayback = false) {
  return { disableRemotePlayback } as unknown as HTMLMediaTargetLike;
}

function override(preference: RemotePlaybackPreference) {
  return preference.targetOverride as { disableRemotePlayback: boolean };
}

describe('RemotePlaybackPreference', () => {
  it('reports no author intent until the value is set through the host', () => {
    const preference = new RemotePlaybackPreference();
    expect(preference.developerWantsDisabled).toBe(false);
  });

  it('reflects the attached element value before the author touches it', () => {
    const preference = new RemotePlaybackPreference();
    preference.attach(createTarget(true));

    expect(override(preference).disableRemotePlayback).toBe(true);
    // A programmatic element write is not author intent.
    expect(preference.developerWantsDisabled).toBe(false);
  });

  it('records author intent and forwards it to the element when set through the host', () => {
    const preference = new RemotePlaybackPreference();
    const target = createTarget(false);
    preference.attach(target);

    override(preference).disableRemotePlayback = true;

    expect(preference.developerWantsDisabled).toBe(true);
    expect(target.disableRemotePlayback).toBe(true);
    expect(override(preference).disableRemotePlayback).toBe(true);
  });

  it('treats an explicit false as author intent without flagging it as disabled', () => {
    const preference = new RemotePlaybackPreference();
    const target = createTarget(true);
    preference.attach(target);

    override(preference).disableRemotePlayback = false;

    expect(preference.developerWantsDisabled).toBe(false);
    expect(target.disableRemotePlayback).toBe(false);
  });

  it('re-applies recorded intent across re-attach', () => {
    const preference = new RemotePlaybackPreference();
    preference.attach(createTarget(false));
    override(preference).disableRemotePlayback = true;

    preference.detach();
    const next = createTarget(false);
    preference.attach(next);

    expect(next.disableRemotePlayback).toBe(true);
  });
});
