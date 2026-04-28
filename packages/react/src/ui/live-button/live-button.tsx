'use client';

import { LiveButtonCore, LiveButtonDataAttrs } from '@videojs/core';
import { selectLiveButton } from '@videojs/core/dom';
import { forwardRef, type ReactNode } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { createMediaButton } from '../create-media-button';

export interface LiveButtonProps extends UIComponentProps<'button', LiveButtonCore.State>, LiveButtonCore.Props {}

const LiveButtonImpl = createMediaButton<LiveButtonCore, LiveButtonProps>({
  displayName: 'LiveButton',
  core: LiveButtonCore,
  stateAttrMap: LiveButtonDataAttrs,
  selector: selectLiveButton,
  action: (core, state) => core.seekToLive(state),
});

/**
 * A button that indicates live status and seeks to the live edge when
 * pressed. Exposes `data-live` while the stream is live (or DVR) and
 * `data-live-edge` while playing at the live edge so skins can style a
 * red-dot ↔ grey-dot treatment.
 *
 * Falls back to `LiveButtonCore.defaultText` (`'Live'` by default) when no
 * children are provided. Override the static field globally for i18n.
 *
 * @example
 * ```tsx
 * <LiveButton />
 * ```
 *
 * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
 */
export const LiveButton = forwardRef<HTMLButtonElement, LiveButtonProps>(function LiveButton(
  { children, ...props },
  ref
): ReactNode {
  return (
    <LiveButtonImpl ref={ref} {...props}>
      {children ?? LiveButtonCore.defaultText}
    </LiveButtonImpl>
  );
});

LiveButton.displayName = 'LiveButton';

export namespace LiveButton {
  export type Props = LiveButtonProps;
  export type State = LiveButtonCore.State;
}
