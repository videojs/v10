/**
 * HTML State Projection
 *
 * Phase 3: Projection (New Architecture)
 * Projects JSX tree to structured HTML data
 * Returns ProjectedHTML[] instead of strings
 * Formatting happens in separate module (format-html.ts)
 */

import type { StateProjector } from '../../../phases/types';
import type {
  HTMLAttributeValue,
  ProjectedHTML,
} from '../../../types';
import type {
  CategorizedContext,
  CategorizedJSXChild,
  CategorizedJSXElement,
  CompilerConfig,
} from '../../types';
import { componentNameToElementName } from '../../../utils/component-names';
import { toKebabCase } from '../../../utils/string-transforms';
import { CLASSNAME_TRACKED_SEPARATELY } from '../../types';
import { resolveClassName } from './resolve-classnames';
import {
  extractTriggerChild,
  generateTooltipPopoverId,
} from './tooltip-popover-helpers';

/**
 * Type guard to check if CategorizedJSXChild is a CategorizedJSXElement
 */
function isCategorizedElement(child: CategorizedJSXChild): child is CategorizedJSXElement {
  return child.type === 'element';
}

// Module-level ID tracking for tooltips/popovers
// TODO: Move to ProjectionState when JSX projectors are fully migrated
const generatedTooltipIds = new Set<string>();
const generatedPopoverIds = new Set<string>();

/**
 * Reset tooltip/popover ID tracking
 * Called before each module projection
 */
export function resetHTMLIds(): void {
  generatedTooltipIds.clear();
  generatedPopoverIds.clear();
}

/**
 * Project JSX tree to structured HTML
 * State-based projector - accesses context.jsx directly
 *
 * @param context - Full categorized context
 * @param _prevState - Previous projection state (accumulated data)
 * @param config - Compiler configuration (for classNameProjectors)
 * @returns Structured HTML array
 */
export const projectHTML: StateProjector<ProjectedHTML[]> = (context, _prevState, config) => {
  // Reset ID tracking for this module
  resetHTMLIds();

  // Project the root JSX element
  return projectElement(context.jsx, context, config);
};

/**
 * Project element name from categorized JSX element
 */
function projectElementName(categorized: CategorizedJSXElement): string {
  // Native elements: lowercase identifier
  if (categorized.category === 'native-element') {
    return categorized.identifier.toLowerCase();
  }

  // Component elements: convert to kebab-case custom element name
  const componentName = categorized.member
    ? `${categorized.identifier}.${categorized.member}`
    : categorized.identifier;

  return componentNameToElementName(componentName);
}

/**
 * Project attributes from categorized JSX element
 * Returns structured attributes object
 */
function projectAttributes(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): Record<string, HTMLAttributeValue> {
  const attrs: Record<string, HTMLAttributeValue> = {};

  for (const [name, value] of Object.entries(categorized.attributes)) {
    // Skip React-specific props
    if (name === 'children' || name === 'key' || name === 'ref') {
      continue;
    }

    // Special handling for className
    if (value === CLASSNAME_TRACKED_SEPARATELY) {
      const resolvedClass = resolveClassName(
        categorized,
        context.classNames,
        config.classNameProjectors,
        context,
      );
      if (resolvedClass) {
        // Split into array for token list representation
        attrs.class = resolvedClass.split(' ');
      }
      continue;
    }

    // Transform attribute name to kebab-case
    const htmlName = toKebabCase(name);

    // Store attribute with proper type
    attrs[htmlName] = value;
  }

  return attrs;
}

/**
 * Project children from categorized JSX element
 * Works with extracted children data (no AST access needed)
 * Returns array of ProjectedHTML | ProjectedHTML[]
 */
function projectChildren(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): (ProjectedHTML | ProjectedHTML[])[] {
  const children: (ProjectedHTML | ProjectedHTML[])[] = [];

  // Process all extracted children in order
  for (const child of categorized.children) {
    if (isCategorizedElement(child)) {
      // JSX element child - project recursively
      const projected = projectElement(child, context, config);
      // Flatten or preserve array based on projection result
      if (projected.length === 1 && projected[0]) {
        children.push(projected[0]);
      } else if (projected.length > 1) {
        children.push(projected);
      }
    } else if (child.type === 'text') {
      // Text child - create text node
      children.push({
        type: 'html',
        name: '#text',
        attributes: { value: child.value },
        children: [],
      });
    } else if (child.type === 'expression') {
      // Expression child - handle {children} → slot transformation
      if (child.expressionType === 'identifier' && child.identifierName === 'children') {
        children.push({
          type: 'html',
          name: 'slot',
          attributes: { name: 'media', slot: 'media' },
          children: [],
        });
      }
      // Other expressions ignored for now
    }
  }

  return children;
}

/**
 * Project single JSX element to ProjectedHTML
 * Dispatches to category-specific logic
 * Returns array to support multi-element projections (tooltips/popovers)
 */
function projectElement(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  // Dispatch based on category
  switch (categorized.category) {
    case 'native-element':
      return projectNativeElement(categorized, context, config);

    case 'media-container':
      return projectMediaContainer(categorized, context, config);

    case 'generic-component':
      return projectGenericComponent(categorized, context, config);

    case 'compound-root':
      return projectCompoundRoot(categorized, context, config);

    case 'tooltip-root':
      return projectTooltipRoot(categorized, context, config);

    case 'popover-root':
      return projectPopoverRoot(categorized, context, config);

    // Tooltip/popover sub-elements are handled by their root projectors
    case 'tooltip-trigger':
    case 'tooltip-positioner':
    case 'tooltip-popup':
    case 'tooltip-portal':
    case 'popover-trigger':
    case 'popover-positioner':
    case 'popover-popup':
    case 'popover-portal':
      // These should not be called directly - they're processed by root projector
      return [];

    default:
      // Unknown category - return comment node
      return [
        {
          type: 'html',
          name: '#comment',
          attributes: { value: `${categorized.category} projector not implemented` },
          children: [],
        },
      ];
  }
}

/**
 * Project native HTML element
 */
function projectNativeElement(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  const name = projectElementName(categorized);
  const attributes = projectAttributes(categorized, context, config);
  const children = projectChildren(categorized, context, config);

  return [
    {
      type: 'html',
      name,
      attributes,
      children,
    },
  ];
}

/**
 * Project MediaContainer element
 */
function projectMediaContainer(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  const attributes = projectAttributes(categorized, context, config);
  const children = projectChildren(categorized, context, config);

  return [
    {
      type: 'html',
      name: 'media-container',
      attributes,
      children,
    },
  ];
}

/**
 * Project generic component element
 */
function projectGenericComponent(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  const name = projectElementName(categorized);
  const attributes = projectAttributes(categorized, context, config);
  const children = projectChildren(categorized, context, config);

  return [
    {
      type: 'html',
      name,
      attributes,
      children,
    },
  ];
}

/**
 * Project compound root element
 * Unwraps compound root and projects its children directly
 */
function projectCompoundRoot(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  // Compound roots are unwrapped - project children directly
  const children = projectChildren(categorized, context, config);

  // Flatten children into array of ProjectedHTML
  return children.flatMap((child) => {
    if (Array.isArray(child)) {
      return child;
    }
    return [child];
  });
}

/**
 * Project Tooltip.Root to trigger + tooltip siblings
 * Transforms 5-level React structure into 2 sibling HTML elements
 */
function projectTooltipRoot(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  // 1. Extract trigger child element (Root → Trigger → child)
  const triggerChild = extractTriggerChild(categorized);

  // 2. Generate unique ID
  const id = generateTooltipPopoverId(triggerChild, 'tooltip', generatedTooltipIds);
  generatedTooltipIds.add(id);

  // 3. Project trigger child element normally
  const [triggerElement] = projectElement(triggerChild, context, config);
  if (!triggerElement) throw new Error('projectElement must return at least one element');

  // 4. Add commandfor attribute to trigger
  triggerElement.attributes.commandfor = id;
  triggerElement.attributes.command = 'show-tooltip';

  // 5. Collect attributes from Root, Positioner, Popup
  const tooltipAttrs: Record<string, HTMLAttributeValue> = {
    id,
    popover: 'manual',
  };

  // Extract attributes from Root element
  for (const [key, value] of Object.entries(categorized.attributes)) {
    if (key === 'delay' || key === 'trackCursorAxis') {
      const htmlName = toKebabCase(key);
      tooltipAttrs[htmlName] = value as HTMLAttributeValue;
    }
  }

  // Find Positioner → Popup to extract their attributes
  const positioner = categorized.children.find(child => child.category === 'tooltip-positioner');
  let popupChildren: (ProjectedHTML | ProjectedHTML[])[] = [];

  if (positioner && isCategorizedElement(positioner)) {
    // Extract Positioner attributes
    for (const [key, value] of Object.entries(positioner.attributes)) {
      if (key === 'side' || key === 'sideOffset' || key === 'collisionPadding') {
        const htmlName = toKebabCase(key);
        tooltipAttrs[htmlName] = value as HTMLAttributeValue;
      }
    }

    // Find Popup element
    const popup = positioner.children.find(child => child.category === 'tooltip-popup');
    if (popup && isCategorizedElement(popup)) {
      // Project popup children
      popupChildren = projectChildren(popup, context, config);
    }
  }

  // 6. Create tooltip element
  const tooltipElement: ProjectedHTML = {
    type: 'html',
    name: 'media-tooltip',
    attributes: tooltipAttrs,
    children: popupChildren,
  };

  // Return trigger + tooltip as siblings
  return [triggerElement, tooltipElement];
}

/**
 * Project Popover.Root to trigger + popover siblings
 * Transforms 5-level React structure into 2 sibling HTML elements
 */
function projectPopoverRoot(
  categorized: CategorizedJSXElement,
  context: CategorizedContext,
  config: CompilerConfig,
): ProjectedHTML[] {
  // 1. Extract trigger child element (Root → Trigger → child)
  const triggerChild = extractTriggerChild(categorized);

  // 2. Generate unique ID
  const id = generateTooltipPopoverId(triggerChild, 'popover', generatedPopoverIds);
  generatedPopoverIds.add(id);

  // 3. Project trigger child element normally
  const [triggerElement] = projectElement(triggerChild, context, config);
  if (!triggerElement) throw new Error('projectElement must return at least one element');

  // 4. Add commandfor/command attributes to trigger (consistent with tooltips)
  triggerElement.attributes.commandfor = id;
  triggerElement.attributes.command = 'toggle-popover';

  // 5. Collect attributes from Root, Positioner, Popup
  // Check for openOnHover to determine popover type
  const hasOpenOnHover = 'openOnHover' in categorized.attributes;

  const popoverAttrs: Record<string, HTMLAttributeValue> = {
    id,
    // Use "manual" when openOnHover is true (like tooltips)
    popover: hasOpenOnHover ? 'manual' : 'auto',
  };

  // Extract attributes from Root element
  for (const [key, value] of Object.entries(categorized.attributes)) {
    if (key === 'delay' || key === 'closeDelay' || key === 'openOnHover') {
      const htmlName = toKebabCase(key);
      popoverAttrs[htmlName] = value as HTMLAttributeValue;
    }
  }

  // Find Positioner → Popup to extract their attributes
  const positioner = categorized.children.find(child => child.category === 'popover-positioner');
  let popupChildren: (ProjectedHTML | ProjectedHTML[])[] = [];

  if (positioner && isCategorizedElement(positioner)) {
    // Extract Positioner attributes
    for (const [key, value] of Object.entries(positioner.attributes)) {
      if (key === 'side' || key === 'sideOffset' || key === 'collisionPadding') {
        const htmlName = toKebabCase(key);
        popoverAttrs[htmlName] = value as HTMLAttributeValue;
      }
    }

    // Find Popup element
    const popup = positioner.children.find(child => child.category === 'popover-popup');
    if (popup && isCategorizedElement(popup)) {
      // Project popup children
      popupChildren = projectChildren(popup, context, config);
    }
  }

  // 6. Create popover element
  const popoverElement: ProjectedHTML = {
    type: 'html',
    name: 'media-popover',
    attributes: popoverAttrs,
    children: popupChildren,
  };

  // Return trigger + popover as siblings
  return [triggerElement, popoverElement];
}
