import type { CSSProperties, PropsWithChildren } from 'react';

import type { Poster } from '@/ui/poster';

export type BaseSkinProps<T = unknown> = PropsWithChildren<
  T & {
    style?: CSSProperties;
    className?: string;
  }
>;

export type BaseVideoSkinProps<T = unknown> = BaseSkinProps<T> & {
  /**
   * Draws the poster image, in place of the `<img>` the skin renders. The URL
   * still comes from the player, so a framework image component is passed the
   * resolved `src` along with the rest of the image props.
   *
   * @example
   * ```tsx
   * <VideoSkin renderPoster={(props) => <Image {...props} alt="" fill />} />
   * ```
   */
  renderPoster?: Poster.Props['render'];
  /** Low-resolution placeholder shown behind the poster while it loads (blur-up effect). */
  placeholder?: string | undefined;
};
