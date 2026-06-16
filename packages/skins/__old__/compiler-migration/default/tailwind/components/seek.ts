import { cn } from '@videojs/utils/style';

const base = 'text-[10px] font-[480] tabular-nums';

export const seek = {
  labelForward: cn(base, 'absolute -right-px -bottom-0.75'),
  labelBackward: cn(base, 'absolute -left-px -bottom-0.75'),
};
