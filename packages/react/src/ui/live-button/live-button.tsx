'use client';

import { LiveButtonCore, LiveButtonDataAttrs, type LiveButtonMediaState } from '@videojs/core';
import { logMissingFeature, selectBuffer, selectLive, selectTime } from '@videojs/core/dom';
import { forwardRef, type ReactNode, useLayoutEffect, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';
import { useOptionalTooltipContext } from '../tooltip/context';

const DISPLAY_NAME = 'LiveButton';

/** Props for the LiveButton component. */
export interface LiveButtonProps extends UIComponentProps<'button', LiveButtonCore.State>, LiveButtonCore.Props {}

/**
 * Indicates live status and seeks to the live edge when activated.
 *
 * Exposes `data-live` while the stream is live (or DVR) and `data-live-edge`
 * while playing at the live edge so skins can style a red-dot ↔ grey-dot
 * treatment. Falls back to `LiveButtonCore.defaultText` (`'Live'` by default)
 * when no children are provided — override the static field globally for i18n.
 *
 * @see https://github.com/video-dev/media-ui-extensions/blob/main/proposals/0007-live-edge.md
 */
export const LiveButton = forwardRef<HTMLButtonElement, LiveButtonProps>(
  function LiveButton(componentProps, forwardedRef): ReactNode {
    const { children, render, className, style, label, disabled, ...elementProps } = componentProps;

    const live = usePlayer(selectLive);
    const time = usePlayer(selectTime);
    const buffer = usePlayer(selectBuffer);

    const media: LiveButtonMediaState | null =
      live && time && buffer
        ? {
            currentTime: time.currentTime,
            seek: time.seek,
            seekable: buffer.seekable,
            liveEdgeStart: live.liveEdgeStart,
            targetLiveWindow: live.targetLiveWindow,
          }
        : null;

    const tooltipCtx = useOptionalTooltipContext();
    const [core] = useState(() => new LiveButtonCore());
    core.setProps({ label, disabled });

    const { getButtonProps, buttonRef } = useButton({
      displayName: DISPLAY_NAME,
      onActivate: () => {
        if (media) core.seekToLive(media);
      },
      isDisabled: () => !!disabled || !media,
    });

    if (media) core.setMedia(media);
    const state = media ? core.getState() : null;
    const labelText = state ? core.getLabel(state) : undefined;

    useLayoutEffect(() => {
      if (!tooltipCtx) return;
      tooltipCtx.setContent(labelText);
      return () => tooltipCtx.setContent(undefined);
    }, [tooltipCtx, labelText]);

    if (!media || !state) {
      if (__DEV__) logMissingFeature(DISPLAY_NAME, selectLive.displayName ?? 'live');
      return null;
    }

    const attrs = core.getAttrs(state);
    const content = children ?? LiveButtonCore.defaultText;

    return renderElement(
      'button',
      { render, className, style },
      {
        state,
        stateAttrMap: LiveButtonDataAttrs,
        ref: [forwardedRef, buttonRef],
        props: [attrs, { children: content, ...elementProps }, getButtonProps()],
      }
    );
  }
);

LiveButton.displayName = DISPLAY_NAME;

export namespace LiveButton {
  export type Props = LiveButtonProps;
  export type State = LiveButtonCore.State;
}
