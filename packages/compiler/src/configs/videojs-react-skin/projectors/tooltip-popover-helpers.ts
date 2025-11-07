/**
 * Tooltip & Popover Projection Helpers
 *
 * Shared utilities for transforming React tooltip/popover structures
 * into flat HTML with commandfor attributes and unique IDs
 */

import type { CategorizedJSXChild, CategorizedJSXElement } from '../../types';
import { toKebabCase } from '../../../utils/string-transforms';

/** Type guard to check if a JSX child is a categorized element (not text/expression) */
function isCategorizedElement(child: CategorizedJSXChild): child is CategorizedJSXElement {
  return 'identifier' in child && 'attributes' in child;
}

/**
 * Extract trigger child element from tooltip/popover Root
 * Navigates: Root → Trigger → child element
 *
 * @param rootElement - Categorized Root element
 * @returns The child element wrapped by Trigger
 * @throws Error if Trigger not found or has no children
 */
export function extractTriggerChild(rootElement: CategorizedJSXElement): CategorizedJSXElement {
  // Find Trigger child in Root's children
  const trigger = rootElement.children.find(child =>
    child.category === 'tooltip-trigger' || child.category === 'popover-trigger',
  );

  if (!trigger) {
    throw new Error(
      `Tooltip/Popover Root must have a Trigger child. Found categories: ${rootElement.children.map(c => c.category).join(', ')}`,
    );
  }

  if (!isCategorizedElement(trigger)) {
    throw new Error('Tooltip/Popover Trigger must be an element, not text or expression');
  }

  // Trigger must have exactly one child
  if (trigger.children.length === 0) {
    throw new Error('Tooltip/Popover Trigger must wrap a child element');
  }

  if (trigger.children.length > 1) {
    console.warn(
      `Tooltip/Popover Trigger has ${trigger.children.length} children, using first child only`,
    );
  }

  const triggerChild = trigger.children[0];
  if (!triggerChild || !isCategorizedElement(triggerChild)) {
    throw new Error('Tooltip/Popover Trigger child must be an element, not text or expression');
  }

  return triggerChild;
}

/**
 * Generate unique ID for tooltip/popover element
 * Pattern: {element-name}-{tooltip|popover}
 * If duplicate exists, append counter: -2, -3, etc.
 *
 * @param triggerElement - The trigger child element
 * @param type - 'tooltip' or 'popover'
 * @param existingIds - Set of already-generated IDs for uniqueness check
 * @returns Unique ID string
 *
 * @example
 * generateTooltipPopoverId(playButton, 'tooltip', new Set())
 * // → 'play-button-tooltip'
 *
 * @example
 * generateTooltipPopoverId(playButton, 'tooltip', new Set(['play-button-tooltip']))
 * // → 'play-button-tooltip-2'
 */
export function generateTooltipPopoverId(
  triggerElement: CategorizedJSXElement,
  type: 'tooltip' | 'popover',
  existingIds: Set<string>,
): string {
  // Extract element name from identifier
  const elementName = toKebabCase(
    triggerElement.identifier || 'element',
  );
  const baseId = `${elementName}-${type}`;

  // If base ID is unique, use it
  if (!existingIds.has(baseId)) {
    return baseId;
  }

  // Otherwise, find the next available number
  let counter = 2;
  while (existingIds.has(`${baseId}-${counter}`)) {
    counter++;
  }
  return `${baseId}-${counter}`;
}

/**
 * Collected attributes from tooltip/popover tree
 */
export interface TooltipPopoverAttributes {
  /** Attributes for the tooltip/popover element */
  tooltipPopoverAttrs: Record<string, string | boolean>;
  /** HTML content for popup body (from Popup children) */
  popupContent: string;
}

/**
 * Collect attributes from tooltip/popover tree
 * Traverses: Root → Portal → Positioner → Popup
 * Extracts attributes from Root, Positioner, and Popup
 *
 * @param rootElement - Categorized Root element
 * @param type - 'tooltip' or 'popover'
 * @returns Object with collected attributes and popup content
 */
export function collectTooltipPopoverAttributes(
  rootElement: CategorizedJSXElement,
  type: 'tooltip' | 'popover',
): TooltipPopoverAttributes {
  const tooltipPopoverAttrs: Record<string, string | boolean> = {};

  // Extract attributes from Root
  // Common: delay, trackCursorAxis
  // Popover-only: closeDelay, openOnHover
  if (rootElement.attributes) {
    for (const [key, value] of Object.entries(rootElement.attributes)) {
      if (key === 'delay'
        || key === 'trackCursorAxis'
        || (type === 'popover' && (key === 'closeDelay' || key === 'openOnHover'))) {
        // Cast to string | boolean (these attributes should never be numbers or symbols)
        if (typeof value === 'string' || typeof value === 'boolean') {
          tooltipPopoverAttrs[key] = value;
        }
      }
    }
  }

  // Find Portal → Positioner → Popup
  const portal = rootElement.children.find(child =>
    child.category === 'tooltip-portal' || child.category === 'popover-portal',
  );

  let positioner: CategorizedJSXElement | undefined;
  let popup: CategorizedJSXElement | undefined;
  let popupContent = '';

  if (portal && isCategorizedElement(portal)) {
    const positionerChild = portal.children.find(child =>
      child.category === 'tooltip-positioner' || child.category === 'popover-positioner',
    );
    positioner = positionerChild && isCategorizedElement(positionerChild) ? positionerChild : undefined;

    if (positioner) {
      // Extract Positioner attributes: side, sideOffset, collisionPadding
      if (positioner.attributes) {
        for (const [key, value] of Object.entries(positioner.attributes)) {
          if (key === 'side' || key === 'sideOffset' || key === 'collisionPadding') {
            // Cast to string | boolean (these attributes should never be numbers or symbols)
            if (typeof value === 'string' || typeof value === 'boolean') {
              tooltipPopoverAttrs[key] = value;
            }
          }
        }
      }

      // Find Popup
      const popupChild = positioner.children.find(child =>
        child.category === 'tooltip-popup' || child.category === 'popover-popup',
      );
      popup = popupChild && isCategorizedElement(popupChild) ? popupChild : undefined;

      if (popup) {
        // Extract className from Popup (will be projected normally)
        if (popup.attributes && popup.attributes.className) {
          // Store for later projection - we'll handle this in the projector
          const className = popup.attributes.className;
          if (typeof className === 'string' || typeof className === 'boolean') {
            tooltipPopoverAttrs.className = className;
          }
        }

        // Popup content will be projected separately by the projector
        // Store reference for now
        popupContent = '<popup-children-placeholder>';
      }
    }
  }

  return {
    tooltipPopoverAttrs,
    popupContent,
  };
}

/**
 * Inject commandfor attribute into HTML element string
 * Optionally inject command="toggle-popover" for popovers
 *
 * @param elementHTML - HTML string with opening tag
 * @param id - ID value for commandfor attribute
 * @param addCommand - If true, also add command="toggle-popover"
 * @returns Modified HTML string with injected attributes
 *
 * @example
 * injectCommandForAttribute('<button class="play">Play</button>', 'play-tooltip')
 * // → '<button commandfor="play-tooltip" class="play">Play</button>'
 *
 * @example
 * injectCommandForAttribute('<button>Toggle</button>', 'settings-popover', true)
 * // → '<button commandfor="settings-popover" command="toggle-popover">Toggle</button>'
 */
export function injectCommandForAttribute(
  elementHTML: string,
  id: string,
  addCommand = false,
): string {
  // Find the opening tag - match from < to first > that's not in a string
  const openTagMatch = elementHTML.match(/^<([a-z][\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)*)(\/?)>/i);

  if (!openTagMatch) {
    throw new Error(`Cannot parse HTML opening tag: ${elementHTML.substring(0, 50)}`);
  }

  const [fullMatch, tagName, existingAttrs, selfClosing] = openTagMatch;

  // Build new attributes
  let newAttrs = ` commandfor="${id}"`;
  if (addCommand) {
    newAttrs += ` command="toggle-popover"`;
  }

  // Reconstruct opening tag with new attributes
  const newOpenTag = `<${tagName}${newAttrs}${existingAttrs}${selfClosing}>`;

  // Replace opening tag in original HTML
  return elementHTML.replace(fullMatch, newOpenTag);
}

/**
 * Transform React prop to HTML attribute
 * Converts camelCase to kebab-case
 * Handles boolean, number, and string values
 *
 * @param key - Prop name (camelCase)
 * @param value - Prop value
 * @returns Formatted attribute string or null if omitted
 *
 * @example
 * transformPropToAttribute('sideOffset', 12)
 * // → 'side-offset="12"'
 *
 * @example
 * transformPropToAttribute('openOnHover', true)
 * // → 'open-on-hover'
 *
 * @example
 * transformPropToAttribute('disabled', false)
 * // → null
 */
export function transformPropToAttribute(
  key: string,
  value: string | number | boolean,
): string | null {
  const attrName = toKebabCase(key);

  // Boolean handling
  if (typeof value === 'boolean') {
    return value ? attrName : null;
  }

  // Number/String - quote the value
  return `${attrName}="${value}"`;
}
