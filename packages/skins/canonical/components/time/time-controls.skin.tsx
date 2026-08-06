import { Time } from '@videojs/core/components';

export interface TimeControlsProps {
  children?: unknown;
}

export function TimeControls({ children }: TimeControlsProps) {
  return (
    <Time.Group>
      <Time.Value type="current" />
      {children}
      <Time.Value toggle type="remaining" />
    </Time.Group>
  );
}
