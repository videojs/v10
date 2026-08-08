import { getMenuTransitionSize, type MenuTransitionSize } from '@videojs/core/dom';
import { withTemporaryStyles } from '@videojs/utils/dom';

const measureStyles = {
  position: 'absolute',
  top: '0px',
  right: 'auto',
  bottom: 'auto',
  left: '0px',
  width: 'max-content',
  height: 'auto',
  'min-width': '160px',
  'max-width': 'none',
};

export function measureMenuTransitionPanel(container: HTMLElement, panel: HTMLElement): MenuTransitionSize {
  return withTemporaryStyles(panel, measureStyles, () => getMenuTransitionSize(container, panel));
}
