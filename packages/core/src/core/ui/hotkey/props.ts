import type { InputAction } from '../input-action';

export type HotkeyTarget = 'player' | 'global';

export interface HotkeyProps {
  keys: string;
  action: InputAction;
  value?: number | undefined;
  disabled?: boolean | undefined;
  target?: HotkeyTarget | undefined;
}
