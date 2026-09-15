'use client';

import { SKIN_HELP_TEXT, SKIN_HELP_URL } from '@videojs/core';
import { cn } from '@videojs/utils/style';

import type { BaseSkinProps } from '../types';

export type BackgroundVideoSkinProps = BaseSkinProps;

export function BackgroundVideoSkin(props: BackgroundVideoSkinProps) {
  const { children, className, ...rest } = props;

  return (
    <div className={cn('media-background-skin', className)} {...rest}>
      {/* Hidden keeps it out of the UI and the accessibility tree; scrapers still read it from server-rendered HTML. */}
      <a rel="help" href={SKIN_HELP_URL} hidden>
        {SKIN_HELP_TEXT}
      </a>
      {children}
    </div>
  );
}
