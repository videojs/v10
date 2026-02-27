'use client';

import type { PopoverState } from '@videojs/core';
import type { ReactNode } from 'react';

export interface PopoverPositionerProps {
  children?: ReactNode;
}

/**
 * Optional grouping wrapper for popover content.
 *
 * In the tech-preview architecture, the Positioner computed placement
 * styles. Positioning now lives on `PopoverPopup` (the element that
 * enters the top layer via the Popover API), so this component is a
 * transparent pass-through kept for backward compatibility.
 */
export function PopoverPositioner({ children }: PopoverPositionerProps): ReactNode {
  return children;
}

export namespace PopoverPositioner {
  export type Props = PopoverPositionerProps;
  export type State = PopoverState;
}
