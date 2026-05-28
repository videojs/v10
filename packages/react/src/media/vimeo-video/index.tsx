'use client';

import type { VimeoConfig, VimeoMediaProps } from '@videojs/core/dom/media/vimeo';
import { buildVimeoIframeSrc, VimeoMedia, vimeoMediaDefaultProps } from '@videojs/core/dom/media/vimeo';
import type { IframeHTMLAttributes, ReactNode, RefCallback } from 'react';
import { forwardRef, useCallback, useState } from 'react';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { useMediaInstance } from '../../utils/use-media-instance';
import { useSyncProps } from '../../utils/use-sync-props';

export interface VimeoVideoProps
  extends Omit<IframeHTMLAttributes<HTMLIFrameElement>, keyof VimeoMediaProps | 'muted'>,
    Partial<VimeoMediaProps> {
  /** Alias for `defaultMuted` — mirrors the HTML `<video muted>` attribute. */
  muted?: boolean;
  children?: ReactNode;
}

/**
 * React component that embeds a Vimeo video via `@vimeo/player`. Renders an
 * `<iframe>` whose `src` is built from the supplied props and attaches a
 * `VimeoMedia` instance to the surrounding player. Supports unlisted videos,
 * live events (`vimeo.com/event/<id>`), `preload`, and `poster`,
 * and arbitrary extra Vimeo `config` (use this for Vimeo-specific knobs like
 * `autopause`, `byline`, `dnt`).
 */
export const VimeoVideo = forwardRef<HTMLIFrameElement, VimeoVideoProps>(function VimeoVideo(
  { children, muted, ...rawProps },
  ref
) {
  const media = useMediaInstance(VimeoMedia);

  const props: Partial<VimeoMediaProps> & Record<string, unknown> = { ...rawProps };
  const resolvedDefaultMuted = rawProps.defaultMuted ?? muted;
  if (resolvedDefaultMuted !== undefined) props.defaultMuted = resolvedDefaultMuted;

  const attachRef = useCallback<RefCallback<HTMLIFrameElement>>(
    (element) => {
      media.target = element;
      return () => {
        media.target = null;
      };
    },
    [media]
  );

  const composedRef = useComposedRefs(attachRef, ref);

  // Compute the iframe src once on mount; subsequent prop changes are
  // forwarded to VimeoMedia (which calls Player.loadVideo) so the iframe
  // element itself isn't replaced on every render.
  const [initialSrc] = useState(() => buildVimeoIframeSrc(props.src ?? '', { ...vimeoMediaDefaultProps, ...props }));

  type VimeoSyncedProps = Pick<
    VimeoMediaProps,
    'src' | 'autoplay' | 'defaultMuted' | 'loop' | 'controls' | 'preload' | 'config'
  >;

  const iframeProps = useSyncProps<VimeoSyncedProps, Record<string, unknown>>(
    media as VimeoMedia & VimeoSyncedProps,
    props,
    vimeoMediaDefaultProps
  );
  const config = props.config as VimeoConfig | null | undefined;
  const dataConfig = config ? JSON.stringify(config) : undefined;
  const referrerPolicy = (config as { referrerpolicy?: string } | null | undefined)?.referrerpolicy;

  return (
    <iframe
      title="Vimeo video player"
      allow="accelerometer; fullscreen; autoplay; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen
      frameBorder={0}
      width="100%"
      height="100%"
      data-config={dataConfig}
      referrerPolicy={referrerPolicy as IframeHTMLAttributes<HTMLIFrameElement>['referrerPolicy']}
      {...iframeProps}
      ref={composedRef}
      src={initialSrc}
    >
      {children}
    </iframe>
  );
});

export namespace VimeoVideo {
  export type Props = VimeoVideoProps;
}
