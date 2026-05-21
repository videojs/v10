'use client';

import { CaptionsMenuCore } from '@videojs/core';
import { logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { usePlayer } from '../../player/context';
import { MenuRoot, type MenuRootProps } from '../menu/menu-root';
import { CaptionsMenuProvider } from './context';

export interface CaptionsMenuRootProps extends Omit<MenuRootProps, 'children'>, CaptionsMenuCore.Props {
  children?: ReactNode;
}

export function CaptionsMenuRoot({
  label,
  formatTrack,
  offLabel,
  menuSectionLabel,
  disabled,
  align = 'center',
  children,
  ...menuProps
}: CaptionsMenuRootProps): ReactNode {
  const textTrack = usePlayer(selectTextTrack);
  const [core] = useState(() => new CaptionsMenuCore());

  core.setProps({ label, formatTrack, offLabel, menuSectionLabel, disabled });

  if (!textTrack) {
    if (__DEV__) logMissingFeature('CaptionsMenu', selectTextTrack.displayName ?? 'textTrack');
    return null;
  }

  core.setMedia(textTrack);
  const state = core.getState();

  return (
    <CaptionsMenuProvider value={{ core, media: textTrack, state }}>
      <MenuRoot align={align} {...menuProps}>
        {children}
      </MenuRoot>
    </CaptionsMenuProvider>
  );
}

export namespace CaptionsMenuRoot {
  export type Props = CaptionsMenuRootProps;
  export type State = CaptionsMenuCore.State;
}
