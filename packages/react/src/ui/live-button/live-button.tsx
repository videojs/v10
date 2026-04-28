'use client';

import { LiveButtonCore, LiveButtonDataAttrs } from '@videojs/core';
import { selectLiveButton } from '@videojs/core/dom';

import type { UIComponentProps } from '../../utils/types';
import { createMediaButton } from '../create-media-button';

export interface LiveButtonProps extends UIComponentProps<'button', LiveButtonCore.State>, LiveButtonCore.Props {}

/**
 * A button that indicates live status and seeks to the live edge when
 * pressed. Exposes `data-live` while the stream is live (or DVR) and
 * `data-edge` while playing at the live edge so skins can style a
 * red-dot ↔ grey-dot treatment.
 *
 * @example
 * ```tsx
 * <LiveButton>
 *   <span className="media-live-button__dot" />
 *   <span className="media-live-button__label">LIVE</span>
 * </LiveButton>
 * ```
 *
 * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
 */
export const LiveButton = createMediaButton<LiveButtonCore, LiveButtonProps>({
  displayName: 'LiveButton',
  core: LiveButtonCore,
  stateAttrMap: LiveButtonDataAttrs,
  selector: selectLiveButton,
  action: (core, state) => core.seekToLive(state),
});

export namespace LiveButton {
  export type Props = LiveButtonProps;
  export type State = LiveButtonCore.State;
}
