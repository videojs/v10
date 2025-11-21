/**
 * Converts a `NamedNodeMap` to a plain object.
 */
export function namedNodeMapToObject(namedNodeMap: NamedNodeMap): Record<string, string> {
  const obj: Record<string, string> = {};

  for (const attr of namedNodeMap) {
    obj[attr.name] = attr.value;
  }

  return obj;
}

/**
 * Sets multiple attributes on an element and handles boolean attributes appropriately.
 *
 * @param element - The element to set attributes on.
 * @param attributes - The attributes to set.
 */
export function setAttributes(element: HTMLElement, attributes: Record<string, any>): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (key === 'style' && typeof value === 'object') {
      for (const [styleKey, styleValue] of Object.entries(value)) {
        if (typeof styleValue === 'string') {
          element.style.setProperty(styleKey, styleValue);
        } else if (styleValue == null) {
          element.style.removeProperty(styleKey);
        }
      }
    } else {
      if (typeof value === 'boolean') {
        element.toggleAttribute(key, value);
      } else if (value === undefined) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    }
  }
}
