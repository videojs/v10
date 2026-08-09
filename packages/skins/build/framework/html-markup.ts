import { type DefaultTreeAdapterMap, parseFragment } from 'parse5';

type HtmlElement = DefaultTreeAdapterMap['element'];
type HtmlParent = DefaultTreeAdapterMap['parentNode'];

interface AttributeEdit {
  offset: number;
  source: string;
}

/** Add stable explicit popup relationships without reserializing generated HTML. */
export function connectHtmlPopups(source: string): string {
  const root = parseFragment(source, { sourceCodeLocationInfo: true });
  const usedIds = collectIds(root);
  const edits: AttributeEdit[] = [];

  visitParents(root, (parent) => {
    for (let index = 0; index < parent.childNodes.length; index++) {
      const popup = asElement(parent.childNodes[index]);
      if (!popup || (popup.tagName !== 'media-tooltip' && popup.tagName !== 'media-popover')) continue;
      const trigger = previousElement(parent, index);
      if (!trigger) throw new Error(`<${popup.tagName}> must immediately follow its trigger in generated HTML.`);

      const popupId = attribute(popup, 'id') ?? uniquePopupId(trigger, popup, usedIds);
      const commandFor = attribute(trigger, 'commandfor');
      if (commandFor && commandFor !== popupId) {
        throw new Error(`<${trigger.tagName}> already targets \`${commandFor}\`, not generated popup \`${popupId}\`.`);
      }
      if (!attribute(popup, 'id')) edits.push(addAttribute(popup, 'id', popupId));
      if (!commandFor) edits.push(addAttribute(trigger, 'commandfor', popupId));
    }
  });

  return edits
    .sort((a, b) => b.offset - a.offset)
    .reduce((html, edit) => `${html.slice(0, edit.offset)}${edit.source}${html.slice(edit.offset)}`, source);
}

function collectIds(root: HtmlParent): Set<string> {
  const ids = new Set<string>();
  visitParents(root, (parent) => {
    for (const child of parent.childNodes) {
      const id = asElement(child) ? attribute(child as HtmlElement, 'id') : undefined;
      if (id) ids.add(id);
    }
  });
  return ids;
}

function visitParents(parent: HtmlParent, visit: (parent: HtmlParent) => void): void {
  visit(parent);
  for (const child of parent.childNodes) {
    const element = asElement(child);
    if (element) visitParents(element, visit);
  }
}

function previousElement(parent: HtmlParent, index: number): HtmlElement | undefined {
  for (let previous = index - 1; previous >= 0; previous--) {
    const element = asElement(parent.childNodes[previous]);
    if (element) return element;
  }
  return undefined;
}

function asElement(node: DefaultTreeAdapterMap['childNode'] | undefined): HtmlElement | undefined {
  return node && 'tagName' in node ? node : undefined;
}

function attribute(element: HtmlElement, name: string): string | undefined {
  return element.attrs.find((attr) => attr.name === name)?.value;
}

function uniquePopupId(trigger: HtmlElement, popup: HtmlElement, used: Set<string>): string {
  const kind = popup.tagName === 'media-tooltip' ? 'tooltip' : 'popover';
  let control = trigger.tagName.replace(/^media-/, '').replace(/-button$/, '');
  if (control === 'seek') control = Number(attribute(trigger, 'seconds')) < 0 ? 'seek-backward' : 'seek-forward';
  if (control === 'mute' && kind === 'popover') control = 'volume';

  const base = `${control}-${kind}`;
  let id = base;
  let suffix = 2;
  while (used.has(id)) id = `${base}-${suffix++}`;
  used.add(id);
  return id;
}

function addAttribute(element: HtmlElement, name: string, value: string): AttributeEdit {
  const startTag = element.sourceCodeLocation?.startTag;
  if (!startTag) throw new Error(`Cannot locate generated <${element.tagName}> start tag.`);
  return { offset: startTag.endOffset - 1, source: ` ${name}="${value}"` };
}
