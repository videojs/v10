/**
 * DOM Testing Helpers
 *
 * Utilities for parsing and querying compiled HTML in tests
 */

/**
 * Parse HTML string into DOM
 */
export function parseHTML(html: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

/**
 * Parse HTML and return the first element in body
 */
export function parseElement(html: string): Element {
  const doc = parseHTML(html);
  const element = doc.body.firstElementChild;

  if (!element) {
    throw new Error('No element found in HTML');
  }

  return element;
}

/**
 * Query selector with better error message
 */
export function querySelector(parent: Element | Document, selector: string): Element {
  const element = parent.querySelector(selector);

  if (!element) {
    throw new Error(`Element not found: ${selector}\n\nHTML:\n${parent instanceof Element ? parent.outerHTML : parent.body.innerHTML}`);
  }

  return element;
}

/**
 * Query all matching elements
 */
export function querySelectorAll(parent: Element | Document, selector: string): Element[] {
  return Array.from(parent.querySelectorAll(selector));
}

/**
 * Check if element has class
 */
export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

/**
 * Get all classes from element
 */
export function getClasses(element: Element): string[] {
  return Array.from(element.classList);
}

/**
 * Check if element exists with optional assertion message
 */
export function elementExists(parent: Element | Document, selector: string): boolean {
  return parent.querySelector(selector) !== null;
}
