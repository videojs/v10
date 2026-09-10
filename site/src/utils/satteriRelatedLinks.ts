import type { MdastContent } from 'satteri';
import { defineMdastPlugin } from 'satteri';

import type { MdastVisitorContext } from './satteriAstroData';

export interface RelatedLink {
  slug: string;
  label: string;
  anchor?: string;
}

const RELATED_HEADING = /^related\b/i;

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

/**
 * Turns the bullet list under a "Related …" heading into a `<RelatedLinks>` card grid.
 *
 * Guides end with "Related components", "Related API", and "Related guides" lists of `<DocsLink>`s. Rendering them as
 * cards, with each page's description, gives the end of a guide the same weight as its link cards elsewhere without
 * touching the Markdown. A list is only converted when every item is a lone DocsLink; anything else stays a list.
 */
export function satteriRelatedLinks() {
  return defineMdastPlugin({
    name: 'astro-related-links',
    list: (node, ctx) => {
      const parent = ctx.parent(node);
      if (!parent) return;

      // Sätteri materialises a fresh object per child, so identity fails, and byte offsets drift past multi-byte
      // characters; the starting line is stable on both sides and identifies the list.
      // SAFETY: a list's parent is a container whose children are MDAST nodes, including the list itself.
      const siblings = parent.children as readonly Node[];
      const line = node.position?.start.line;
      const index = siblings.findIndex((sibling) => sibling.type === 'list' && sibling.position?.start.line === line);
      const previous = index > 0 ? siblings[index - 1] : undefined;
      if (!previous || previous.type !== 'heading' || !RELATED_HEADING.test(ctx.textContent(previous).trim())) return;

      const items: RelatedLink[] = [];

      for (const item of node.children) {
        const link = readItem(item, ctx);
        if (!link) return;

        items.push(link);
      }

      if (items.length === 0) return;

      // SAFETY: the literal is a well-formed `mdxJsxFlowElement`; Sätteri's `MdastContent` union omits JSX nodes.
      ctx.replaceNode(node, {
        type: 'mdxJsxFlowElement',
        name: 'RelatedLinks',
        attributes: [{ type: 'mdxJsxAttribute', name: 'items', value: JSON.stringify(items) }],
        children: [],
      } as MdastContent);
    },
  });
}
