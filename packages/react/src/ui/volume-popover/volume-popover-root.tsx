import { VolumePopoverCore } from '@videojs/core';
import { selectVolume } from '@videojs/core/dom';
import type { MediaVolumeState } from '@videojs/media';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

import { usePlayer } from '../../player/context';
import { Popover } from '../popover';
import { usePopoverContext } from '../popover/context';
import type { PopoverRootProps } from '../popover/popover-root';
import { VolumePopoverContextProvider } from './context';

const unavailableVolume: MediaVolumeState = {
  volume: 0,
  muted: false,
  volumeAvailability: 'unsupported',
  mutedAvailability: 'unsupported',
  setVolume: () => 0,
  toggleMuted: () => false,
};

export interface VolumePopoverRootProps extends PopoverRootProps {}

/** Owns volume availability and the popover interaction lifecycle. */
export function VolumePopoverRoot({ children, ...props }: VolumePopoverRootProps): ReactNode {
  const volume = usePlayer(selectVolume);
  const [core] = useState(() => new VolumePopoverCore(props));

  core.setProps(props);
  core.setMedia(volume ?? unavailableVolume);

  return (
    <Popover.Root {...props}>
      <VolumePopoverState core={core}>{children}</VolumePopoverState>
    </Popover.Root>
  );
}

function VolumePopoverState({ core, children }: { core: VolumePopoverCore; children?: ReactNode }): ReactNode {
  const { popover } = usePopoverContext();

  core.setInput(popover.input.current);
  const state = core.getState();

  useEffect(() => {
    if (state.hidden) popover.close('imperative-action');
  }, [popover, state.hidden]);

  return <VolumePopoverContextProvider value={{ state }}>{children}</VolumePopoverContextProvider>;
}

export namespace VolumePopoverRoot {
  export type Props = VolumePopoverRootProps;
  export type State = VolumePopoverCore.State;
}
