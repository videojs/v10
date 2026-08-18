import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { addMediaComponent, getMediaComponents } from '@videojs/media/dom/media-host';
import { MuxData as MuxDataComponent, MuxMedia } from '@videojs/media/dom/mux';
import { describe, expect, it, vi } from 'vitest';
import { createPlayerWrapper } from '../../testing/mocks';
import { MuxData } from '../mux-data';

function setup() {
  const media = new MuxMedia();
  const { value, Wrapper } = createPlayerWrapper();
  value.media = media as unknown as Media;
  return { media, Wrapper };
}

describe('MuxData', () => {
  it('registers a MuxData component with the media from context', () => {
    const { media, Wrapper } = setup();

    render(<MuxData />, { wrapper: Wrapper });

    expect(getMediaComponents(media).get(MuxDataComponent)).toBeInstanceOf(MuxDataComponent);
  });

  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    render(<MuxData envKey="test-key" playerSoftwareName="mux-video" disableCookies />, { wrapper: Wrapper });

    const component = getMediaComponents(media).get(MuxDataComponent)!;
    expect(component.envKey).toBe('test-key');
    expect(component.playerSoftwareName).toBe('mux-video');
    expect(component.disableCookies).toBe(true);
  });

  it('disables monitoring when MuxDataSdk is explicitly undefined', () => {
    const { media, Wrapper } = setup();
    const MuxDataSdk = {
      monitor: vi.fn(),
      utils: { now: () => 0 },
    } as unknown as NonNullable<MuxDataComponent['MuxDataSdk']>;

    const { rerender } = render(<MuxData MuxDataSdk={MuxDataSdk} />, { wrapper: Wrapper });
    const component = getMediaComponents(media).get(MuxDataComponent)!;
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

    expect(getMediaComponents(media).get(MuxDataComponent)!.disableCookies).toBe(false);
  });

  it('keeps the component alive when the media host is destroyed while mounted', () => {
    const { media, Wrapper } = setup();
    const destroy = vi.spyOn(MuxDataComponent.prototype, 'destroy');

    render(<MuxData />, { wrapper: Wrapper });
    const component = getMediaComponents(media).get(MuxDataComponent)!;

    media.destroy();

    // The host detaches and unregisters components it doesn't own; this one is
    // owned by the still-mounted `MuxData` and follows the next media.
    expect(destroy).not.toHaveBeenCalled();
    expect(getMediaComponents(media).get(MuxDataComponent)).toBeUndefined();

    const next = new MuxMedia();
    addMediaComponent(next, component);
    expect(getMediaComponents(next).get(MuxDataComponent)).toBe(component);

    destroy.mockRestore();
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<MuxData />, { wrapper: Wrapper });
    unmount();

    expect(getMediaComponents(media).get(MuxDataComponent)).toBeUndefined();
  });
});
