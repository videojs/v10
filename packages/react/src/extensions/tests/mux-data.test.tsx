import { render } from '@testing-library/react';
import type { Media } from '@videojs/media';
import { getMediaExtensions } from '@videojs/media/dom';
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
  it('syncs props to the component', () => {
    const { media, Wrapper } = setup();

    const { rerender } = render(<MuxData envKey="test-key" playerSoftwareName="mux-video" disableCookies />, {
      wrapper: Wrapper,
    });

    const component = getMediaExtensions(media).get(MuxDataExtension)!;

    expect(component.envKey).toBe('test-key');
    expect(component.playerSoftwareName).toBe('mux-video');
    expect(component.disableCookies).toBe(true);

    rerender(<MuxData />);
    expect(component.disableCookies).toBe(false);
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
});
