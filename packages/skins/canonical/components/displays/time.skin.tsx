import { Time as TimePrimitive } from '@videojs/core/components';

export interface TimeProps {
  children?: unknown;
}

export function Time({ children }: TimeProps) {
  return (
    <TimePrimitive.Group>
      <TimePrimitive.Value type="current" />
      {children}
      <TimePrimitive.Value toggle type="remaining" />
    </TimePrimitive.Group>
  );
}
