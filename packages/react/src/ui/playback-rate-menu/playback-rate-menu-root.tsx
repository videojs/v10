'use client';

import { PlaybackRateMenuCore } from '@videojs/core';
import { logMissingFeature, selectPlaybackRate } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { usePlayer } from '../../player/context';
import { MenuRoot, type MenuRootProps } from '../menu/menu-root';
import { PlaybackRateMenuProvider } from './context';

export interface PlaybackRateMenuRootProps extends Omit<MenuRootProps, 'children'>, PlaybackRateMenuCore.Props {
  children?: ReactNode;
}

export function PlaybackRateMenuRoot({
  label,
  formatRate,
  disabled,
  align = 'center',
  children,
  ...menuProps
}: PlaybackRateMenuRootProps): ReactNode {
  const playbackRate = usePlayer(selectPlaybackRate);
  const [core] = useState(() => new PlaybackRateMenuCore());

  core.setProps({ label, formatRate, disabled });

  if (!playbackRate) {
    if (__DEV__) logMissingFeature('PlaybackRateMenu', selectPlaybackRate.displayName ?? 'playbackRate');
    return null;
  }

  core.setMedia(playbackRate);
  const state = core.getState();

  return (
    <PlaybackRateMenuProvider value={{ core, media: playbackRate, state }}>
      <MenuRoot align={align} {...menuProps}>
        {children}
      </MenuRoot>
    </PlaybackRateMenuProvider>
  );
}

export namespace PlaybackRateMenuRoot {
  export type Props = PlaybackRateMenuRootProps;
  export type State = PlaybackRateMenuCore.State;
}
