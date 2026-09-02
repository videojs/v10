import {
  onSandboxStateChange,
  type PreloadValue,
  readSandboxState,
  type SandboxState,
} from '@app/shared/sandbox-listener';
import { useEffect, useState } from 'react';

import { installSandboxMirror } from './../sandbox-mirror';

/** The attributes the settings menu controls, as props for a media component. */
export interface SandboxMediaProps {
  autoPlay: boolean;
  muted: boolean;
  loop: boolean;
  preload: PreloadValue;
}

export interface Sandbox extends SandboxState {
  readonly mediaProps: SandboxMediaProps;
}

/** The shell's selections for this page, kept current as it streams changes after load. */
export function useSandbox(): Sandbox {
  const [state, setState] = useState(readSandboxState);

  useEffect(() => onSandboxStateChange((change) => setState((current) => ({ ...current, ...change }))), []);
  useEffect(() => installSandboxMirror(), []);

  const { autoplay, muted, loop, preload } = state;

  return { ...state, mediaProps: { autoPlay: autoplay, muted, loop, preload } };
}
