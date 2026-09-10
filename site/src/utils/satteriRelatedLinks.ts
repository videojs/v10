import type { MdastContent } from 'satteri';
import { defineMdastPlugin, type MdastPluginInput } from 'satteri';

import type { MdastVisitorContext } from './satteriAstroData';

export interface RelatedLink {
  slug: string;
  label: string;
  anchor?: string;
}

/** Heading text for the single section that replaces the authored "Related …" headings. */
export const RELATED_HEADING_TEXT = 'Related pages';

const RELATED_HEADING = /^related\b\s*(.*)$/i;

type Node = Parameters<MdastVisitorContext['textContent']>[0];

interface JsxAttribute {
  type: string;
  name?: string;
  value?: unknown;
}

/** The subset of an MDX JSX node this plugin reads; Sätteri's node types don't expose JSX attributes directly. */
interface JsxNode {
  type: string;
  name?: string | null;
  attributes?: JsxAttribute[];
  children?: Node[];
}

function asJsx(node: Node): JsxNode {
  // SAFETY: every MDAST node is an object with `type`; the optional fields are read defensively.
  return node as JsxNode;
}

/** A plain-string attribute. Expression attributes arrive as objects and are ignored. */
function stringAttribute(node: JsxNode, name: string): string | undefined {
  const attribute = node.attributes?.find((entry) => entry.type === 'mdxJsxAttribute' && entry.name === name);
  const value = attribute?.value;
  if (value == null || Object(value) === value) return undefined;

  return String(value);
}

function isDocsLink(node: Node): boolean {
  const jsx = asJsx(node);

  return (jsx.type === 'mdxJsxFlowElement' || jsx.type === 'mdxJsxTextElement') && jsx.name === 'DocsLink';
}

function isBlankText(node: Node, ctx: MdastVisitorContext): boolean {
  return node.type === 'text' && ctx.textContent(node).trim() === '';
}

/**
 * A list item qualifies when its only meaningful content is one `<DocsLink slug="…">label</DocsLink>`. MDX parses a tag
 * that fills the line as a flow element and an inline one as a text element inside a paragraph; accept both.
 */
function readItem(item: Node, ctx: MdastVisitorContext): RelatedLink | null {
  let content = (asJsx(item).children ?? []).filter((child) => !isBlankText(child, ctx));

  if (content.length === 1 && content[0]!.type === 'paragraph') {
    content = (asJsx(content[0]!).children ?? []).filter((child) => !isBlankText(child, ctx));
  }

  const [link] = content;
  if (content.length !== 1 || !link || !isDocsLink(link)) return null;

  const slug = stringAttribute(asJsx(link), 'slug');
  if (!slug) return null;

  const related: RelatedLink = { slug, label: ctx.textContent(link).trim() };
  const anchor = stringAttribute(asJsx(link), 'anchor');

  if (anchor) related.anchor = anchor;

  return related;
}

/** Every item of a list as related links, or null when any item is something other than a lone DocsLink. */
function readList(list: Node, ctx: MdastVisitorContext): RelatedLink[] | null {
  const items: RelatedLink[] = [];

  for (const item of asJsx(list).children ?? []) {
    const link = readItem(item, ctx);
    if (!link) return null;

    items.push(link);
  }

  return items.length > 0 ? items : null;
}

/**
 * Sätteri materialises a fresh object per child, so identity fails, and byte offsets drift past multi-byte characters;
 * the starting line is stable on both sides and identifies a node among its siblings.
 */
function siblingIndex(node: Node, ctx: MdastVisitorContext): { siblings: readonly Node[]; index: number } | null {
  const parent = ctx.parent(node);
  if (!parent) return null;

  // SAFETY: a node's parent is a container whose children are MDAST nodes, including the node itself.
  const siblings = parent.children as readonly Node[];
  const line = node.position?.start.line;
  const index = siblings.findIndex((sibling) => sibling.type === node.type && sibling.position?.start.line === line);

  return index === -1 ? null : { siblings, index };
}

/** "Related components" → "Components"; a bare "Related" has no group label. */
function groupLabel(headingText: string): string | undefined {
  const rest = headingText.match(RELATED_HEADING)?.[1]?.trim();

  return rest ? rest.charAt(0).toUpperCase() + rest.slice(1) : undefined;
}

/**
 * Folds the "Related …" sections at the end of a guide into one "Related pages" section of card grids.
 *
 * Guides end with "Related components", "Related API", and "Related guides" lists of `<DocsLink>`s. The first such
 * heading becomes "Related pages"; the others are removed and each list becomes a `<RelatedLinks>` grid labelled with
 * the group it came from, with each card showing the target page's description. Nothing in the Markdown changes.
 *
 * A heading and list are only converted when every item is a lone DocsLink; anything else is left alone. The plugin is
 * a factory so the "first related heading" state resets per document.
 */
export function satteriRelatedLinks(): MdastPluginInput {
  return () => {
    let renamedHeading = false;

    return defineMdastPlugin({
      name: 'astro-related-links',
      heading: (node, ctx) => {
        if (!RELATED_HEADING.test(ctx.textContent(node).trim())) return;

        const position = siblingIndex(node, ctx);
        if (!position) return;

        const next = position.siblings[position.index + 1];
        if (!next || next.type !== 'list' || !readList(next, ctx)) return;

        if (renamedHeading) {
          ctx.removeNode(node);
          return;
        }

        renamedHeading = true;
        // SAFETY: a heading with a single text child is a valid MDAST heading node.
        ctx.replaceNode(node, {
          type: 'heading',
          depth: node.depth,
          children: [{ type: 'text', value: RELATED_HEADING_TEXT }],
        } as MdastContent);
      },
      list: (node, ctx) => {
        const position = siblingIndex(node, ctx);
        if (!position) return;

        const previous = position.index > 0 ? position.siblings[position.index - 1] : undefined;
        if (!previous || previous.type !== 'heading') return;

        const headingText = ctx.textContent(previous).trim();
        if (!RELATED_HEADING.test(headingText)) return;

        const items = readList(node, ctx);
        if (!items) return;

        const attributes = [{ type: 'mdxJsxAttribute', name: 'items', value: JSON.stringify(items) }];
        const label = groupLabel(headingText);

        if (label) attributes.push({ type: 'mdxJsxAttribute', name: 'label', value: label });

        // SAFETY: the literal is a well-formed `mdxJsxFlowElement`; Sätteri's `MdastContent` union omits JSX nodes.
        ctx.replaceNode(node, {
          type: 'mdxJsxFlowElement',
          name: 'RelatedLinks',
          attributes,
          children: [],
        } as MdastContent);
      },
    });
  };
}
