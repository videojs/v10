import { cleanup, render } from '@testing-library/react';
import type { MediaEngineHost } from '@videojs/media';
import type { RefCallback } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAttachMedia } from '../use-attach-media';
import { useComposedRefs } from '../use-composed-refs';

afterEach(cleanup);

describe('useAttachMedia', () => {
  it('attaches acquired media without cycling a forwarded ref', () => {
    const forwardedRef = vi.fn<RefCallback<HTMLVideoElement>>();
    const media = {
      engine: null,
      attach: vi.fn(),
      detach: vi.fn(),
      destroy: vi.fn(),
    } satisfies MediaEngineHost;

    function Host({ currentMedia }: { currentMedia: MediaEngineHost | null }) {
      const attachRef = useAttachMedia(currentMedia);
      const ref = useComposedRefs(attachRef, forwardedRef);
      return (
        <video ref={ref}>
          <track kind="captions" />
        </video>
      );
    }

    const { container, rerender, unmount } = render(<Host currentMedia={null} />);
    const target = container.querySelector('video')!;

    expect(forwardedRef).toHaveBeenCalledOnce();
    expect(forwardedRef).toHaveBeenLastCalledWith(target);
    expect(media.attach).not.toHaveBeenCalled();

    rerender(<Host currentMedia={media} />);

    expect(media.attach).toHaveBeenCalledOnce();
    expect(media.attach).toHaveBeenCalledWith(target);
    expect(forwardedRef).toHaveBeenCalledOnce();

    unmount();

    expect(media.detach).toHaveBeenCalledOnce();
  });
});
