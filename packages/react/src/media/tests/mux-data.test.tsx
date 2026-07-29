import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { getMediaComponents } from '@videojs/media/dom/media-host';
import { MuxData as MuxDataComponent, MuxMedia } from '@videojs/media/dom/mux';
import { describe, expect, it } from 'vitest';
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

  it('resets a removed prop to its default', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<MuxData disableCookies />, { wrapper: Wrapper });
    rerender(<MuxData />);

    expect(getMediaComponents(media).get(MuxDataComponent)!.disableCookies).toBe(false);
  });

  it('removes the component on unmount', () => {
    const { media, Wrapper } = setup();

    const { unmount } = render(<MuxData />, { wrapper: Wrapper });
    unmount();

    expect(getMediaComponents(media).get(MuxDataComponent)).toBeUndefined();
  });
});
