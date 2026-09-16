import { escapeHtml } from '../string/escape-html';

export interface AttributeSnapshotEntry {
  name: string;
  value: string | null;
}

export type AttributeSnapshot = readonly AttributeSnapshotEntry[];

/** Set an attribute to a changed string value, or remove it when the value is `null`. Equal values are not rewritten. */
export function setAttributeValue(element: Element, name: string, value: string | null): void {
  if (value === null) {
    element.removeAttribute(name);
  } else if (element.getAttribute(name) !== value) {
    element.setAttribute(name, value);
  }
}

/** Capture authored values for the selected attributes. */
export function snapshotAttributes(element: Element, names: Iterable<string>): AttributeSnapshot {
  return [...names].map((name) => ({ name, value: element.getAttribute(name) }));
}

/** Restore a snapshot created by `snapshotAttributes`. */
export function restoreAttributes(element: Element, snapshot: AttributeSnapshot): void {
  for (const { name, value } of snapshot) {
    setAttributeValue(element, name, value);
  }
}

/** Convert a NamedNodeMap to a plain object. */
export function namedNodeMapToObject(namedNodeMap: NamedNodeMap) {
  const obj: Record<string, string> = {};

  for (const attr of namedNodeMap) {
    obj[attr.name] = attr.value;
  }

  return obj;
}

/** Helper function to serialize attributes into a string. */
export function serializeAttributes(attrs: Record<string, string>) {
  let html = '';

  for (const key in attrs) {
    const value = attrs[key]!;

    if (value === '') html += ` ${key}`;
    else html += ` ${key}="${escapeHtml(value)}"`;
  }

  return html;
}
