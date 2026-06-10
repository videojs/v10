import { applyStyles } from '@videojs/utils/dom';

export const visuallyHiddenStyle = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: '0',
  margin: '-1px',
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: '0',
} as const satisfies Record<string, string>;

export function applyVisuallyHiddenStyle(element: HTMLElement): void {
  applyStyles(element, visuallyHiddenStyle);
}
