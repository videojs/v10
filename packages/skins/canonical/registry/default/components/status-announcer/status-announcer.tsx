import { StatusAnnouncer as StatusAnnouncerPrimitive } from '@videojs/react';
import { cn, resolveClassName } from '@/components/videojs/utils';

export interface StatusAnnouncerProps extends Omit<StatusAnnouncerPrimitive.Props, 'children'> {}

export function StatusAnnouncer({ className, ...props }: StatusAnnouncerProps) {
  return (
    <StatusAnnouncerPrimitive {...props} className={(state) => cn('sr-only', resolveClassName(className, state))} />
  );
}
