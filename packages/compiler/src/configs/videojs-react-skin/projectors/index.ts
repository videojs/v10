/**
 * Videojs React Skin - Phase 3 Projectors
 *
 * HTML-specific transformation logic for @videojs/react skin compilation
 * Transforms categorized usage into HTML output structures
 */

// className projectors (element-level)
export {
  projectComponentMatch,
  projectGenericStyle,
  projectLiteralClasses,
} from './classnames';

// CSS template reference projector
export { projectCSS } from './css';

// HTML structure projector
export { projectHTML, resetHTMLIds } from './html';

// Import projector
export { projectImports } from './imports';

// Element naming projectors
export { projectElementClassName, projectElementName } from './names';

// Transformation helpers (shared utilities)
export {
  collectTooltipPopoverAttributes,
  extractTriggerChild,
  generateTooltipPopoverId,
  injectCommandForAttribute,
  transformPropToAttribute,
} from './tooltip-popover-helpers';
