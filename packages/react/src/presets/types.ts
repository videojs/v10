import type { CSSProperties, PropsWithChildren } from 'react';

import type { Poster } from '@/ui/poster';

/** Shared layout props for React skins, combined with any skin-specific props in `T`. */
export type BaseSkinProps<T = unknown> = PropsWithChildren<
  T & {
    /** Inline styles applied to the skin's Container. */
    style?: CSSProperties;

    /** Class name applied to the skin's Container. */
    className?: string;
  }
>;

/** Shared props for video skins, including poster rendering customization. */
export type BaseVideoSkinProps<T = unknown> = BaseSkinProps<T> & {
  /**
   * Draws the poster image, in place of the `<img>` the skin renders. The URL still comes from the player, as `src`
   * alongside the rest of the image props — undefined until one resolves.
   *
   * @example
   *   ```tsx
   *   <VideoSkin
   *     renderPoster={({ src, ...props }: ComponentProps<'img'>) =>
   *       src ? <Image {...props} src={src} alt="" fill /> : null
   *     }
   *   />
   *   ```;
   */
  renderPoster?: Poster.Props['render'];
};
