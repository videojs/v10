import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { addMediaExtension, getMediaExtensions } from '@videojs/media/dom';
import { MuxDataExtension } from '@videojs/mux-data';
import { MuxVideoAdapter } from '@videojs/mux-video';
import { describe, expect, it, vi } from 'vite-plus/test';

import { createPlayerWrapper } from '../../testing/mocks';
import { MuxData } from '../mux-data';

function setup() {
  const media = new MuxVideoAdapter();
  const { value, Wrapper } = createPlayerWrapper();

  value.media = media as unknown as Media;
  return { media, Wrapper };
}

describe('MuxData', () => {
  it('registers a MuxData component with the media from context', () => {
    const { media, Wrapper } = setup();

    render(<MuxData />, { wrapper: Wrapper });

    expect(getMediaExtensions(media).get(MuxDataExtension)).toBeInstanceOf(MuxDataExtension);
  });

  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    render(<MuxData envKey="test-key" playerSoftwareName="mux-video" disableCookies />, { wrapper: Wrapper });

    const component = getMediaExtensions(media).get(MuxDataExtension)!;

    expect(component.envKey).toBe('test-key');
    expect(component.playerSoftwareName).toBe('mux-video');
    expect(component.disableCookies).toBe(true);
  });

  it('disables monitoring when MuxDataSdk is explicitly undefined', () => {
    const { media, Wrapper } = setup();
    const MuxDataSdk = {
      monitor: vi.fn(),
      utils: { now: () => 0 },
    } as unknown as NonNullable<MuxDataExtension['MuxDataSdk']>;

    const { rerender } = render(<MuxData MuxDataSdk={MuxDataSdk} />, { wrapper: Wrapper });
    const component = getMediaExtensions(media).get(MuxDataExtension)!;

    expect(component.MuxDataSdk).toBe(MuxDataSdk);

    rerender(<MuxData MuxDataSdk={undefined} />);
    expect(component.MuxDataSdk).toBeUndefined();

    rerender(<MuxData />);
    expect(component.MuxDataSdk).toBeDefined();
  });

  it('resets a removed prop to its default', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<MuxData disableCookies />, { wrapper: Wrapper });

    rerender(<MuxData />);

    expect(getMediaExtensions(media).get(MuxDataExtension)!.disableCookies).toBe(false);
  });

  it('keeps the component alive when the media adapter is destroyed while mounted', () => {
    const { media, Wrapper } = setup();
    const destroy = vi.spyOn(MuxDataExtension.prototype, 'destroy');

    render(<MuxData />, { wrapper: Wrapper });
    const component = getMediaExtensions(media).get(MuxDataExtension)!;

    media.destroy();

    // The host detaches and unregisters components it doesn't own; this one is
    // owned by the still-mounted `MuxData` and follows the next media.
    expect(destroy).not.toHaveBeenCalled();
    expect(getMediaExtensions(media).get(MuxDataExtension)).toBeUndefined();

    const next = new MuxVideoAdapter();

    addMediaExtension(next, component);
    expect(getMediaExtensions(next).get(MuxDataExtension)).toBe(component);

    destroy.mockRestore();
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<MuxData />, { wrapper: Wrapper });

    unmount();

    expect(getMediaExtensions(media).get(MuxDataExtension)).toBeUndefined();
  });
});
