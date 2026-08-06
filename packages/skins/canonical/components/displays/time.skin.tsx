import { Time as TimePrimitive } from '@videojs/core/components';

export interface TimeProps {
  type?: 'current' | 'duration' | 'remaining' | undefined;
  toggle?: boolean | undefined;
}

export function Time({ type = 'current', toggle }: TimeProps = {}) {
  return <TimePrimitive.Value type={type} toggle={toggle} />;
}
