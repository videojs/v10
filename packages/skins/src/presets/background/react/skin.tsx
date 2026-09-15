'use client';

import { SKIN_HELP_URL } from '@videojs/core';
import { cn } from '@videojs/utils/style';

import type { BaseSkinProps } from '../types';

export type BackgroundVideoSkinProps = BaseSkinProps;

export function BackgroundVideoSkin(props: BackgroundVideoSkinProps) {
  const { children, className, ...rest } = props;

  return (
    <div className={cn('media-background-skin', className)} {...rest}>
      {/* React hoists the link into <head>, so server-rendered pages carry it in their HTML. */}
      <link rel="help" href={SKIN_HELP_URL} />
      {children}
    </div>
  );
}
