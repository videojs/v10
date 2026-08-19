import type { InputAction } from '../input-action/input-action';

export interface HotkeyProps {
  keys: string;
  action: InputAction;
  value?: number | undefined;
  disabled?: boolean | undefined;
  target?: 'player' | 'document' | undefined;
}
