/**
 * HTML Formatting Utilities
 *
 * Converts structured ProjectedHTML to HTML strings
 * Separated from projection logic (similar to format-imports)
 * Pure formatting - no projection logic
 */

import type { HTMLAttributeValue, ProjectedHTML } from '../../types';

/**
 * Formatting options for HTML output
 */
export interface FormattingOptions {
  /**
   * Initial depth level for indentation
   * Depth 0 = no indent, depth 1 = one indent unit, etc.
   */
  depth: number;

  /**
   * String to use for one level of indentation
   * Typically '  ' (2 spaces) or '\t' (tab)
   */
  indentStyle: string;
}

/**
 * Format HTML attribute value
 * Handles strings, numbers, booleans, and string arrays
 */
function formatAttributeValue(value: HTMLAttributeValue): string {
  if (Array.isArray(value)) {
    // Token list (e.g., class names)
    return value.join(' ');
  }
  if (typeof value === 'boolean') {
    // Boolean attributes are handled at the attribute level
    return '';
  }
  return String(value);
}

/**
 * Format HTML attributes to attribute string
 * Returns string with leading space if non-empty
 */
function formatAttributes(attributes: Record<string, HTMLAttributeValue>): string {
  const attrs: string[] = [];

  for (const [name, value] of Object.entries(attributes)) {
    // Special case for text/comment nodes
    if (name === 'value') {
      continue;
    }

    // Boolean attributes
    if (typeof value === 'boolean') {
      if (value) {
        attrs.push(name); // Just the attribute name for true
      }
      // Skip false boolean attributes
      continue;
    }

    // Regular attributes
    const formattedValue = formatAttributeValue(value);
    attrs.push(`${name}="${formattedValue}"`);
  }

  return attrs.length > 0 ? ` ${attrs.join(' ')}` : '';
}

/**
 * Generate indentation string for given depth
 */
function indent(depth: number, style: string): string {
  return style.repeat(depth);
}

/**
 * Check if element has only text content (no child elements)
 */
function hasOnlyTextContent(children: (ProjectedHTML | ProjectedHTML[])[]): boolean {
  if (children.length === 0) return false;
  if (children.length > 1) return false;

  const child = children[0];
  if (!child || Array.isArray(child)) return false;

  return child.name === '#text';
}

/**
 * Format single ProjectedHTML element to HTML string
 * Recursive - handles children with proper indentation
 */
export function formatHTMLElement(
  element: ProjectedHTML,
  depth: number,
  options: FormattingOptions,
): string {
  const indentStr = indent(depth, options.indentStyle);

  // Special handling for text nodes (no indentation - inline)
  if (element.name === '#text') {
    return element.attributes.value as string;
  }

  // Special handling for comment nodes
  if (element.name === '#comment') {
    return `${indentStr}<!-- ${element.attributes.value} -->`;
  }

  // Regular elements
  const attributes = formatAttributes(element.attributes);

  // Empty elements
  if (element.children.length === 0) {
    return `${indentStr}<${element.name}${attributes}></${element.name}>`;
  }

  // Elements with only text content - keep inline
  if (hasOnlyTextContent(element.children)) {
    const textNode = element.children[0] as ProjectedHTML;
    const text = textNode.attributes.value as string;
    return `${indentStr}<${element.name}${attributes}>${text}</${element.name}>`;
  }

  // Elements with child elements - format with newlines
  const children = formatHTMLChildren(element.children, depth + 1, options);
  return `${indentStr}<${element.name}${attributes}>\n${children}\n${indentStr}</${element.name}>`;
}

/**
 * Format children array to HTML string
 * Handles both ProjectedHTML and ProjectedHTML[] (for multi-element projections)
 */
function formatHTMLChildren(
  children: (ProjectedHTML | ProjectedHTML[])[],
  depth: number,
  options: FormattingOptions,
): string {
  return children
    .map((child) => {
      if (Array.isArray(child)) {
        // Array of elements (e.g., from compound projections like tooltip trigger + tooltip)
        // These are siblings at the same depth
        return child.map(c => formatHTMLElement(c, depth, options)).join('\n');
      }
      // Single element
      return formatHTMLElement(child, depth, options);
    })
    .join('\n');
}

/**
 * Format ProjectedHTML array to HTML string
 * Entry point - formats entire HTML tree
 *
 * @param elements - Array of ProjectedHTML elements to format
 * @param options - Optional formatting options (defaults to depth 0, 2-space indent)
 * @param options.depth - Starting indentation depth (default: 0)
 * @param options.indentStyle - Indentation string to use (default: '  ')
 */
export function formatHTML(
  elements: ProjectedHTML[],
  { depth = 0, indentStyle = '  ' }: FormattingOptions = { depth: 0, indentStyle: '  ' },
): string {
  return elements
    .map(el => formatHTMLElement(el, depth, { depth, indentStyle }))
    .join('\n');
}
