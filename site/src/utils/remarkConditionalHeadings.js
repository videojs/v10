import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kebabCase } from 'es-toolkit/string';
import GithubSlugger from 'github-slugger';
import { buildComponentReferenceTocHeadings, createComponentReferenceModel } from './componentReferenceModel';
import { buildUtilReferenceTocHeadings, createUtilReferenceModel } from './utilReferenceModel';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const COMPONENT_REF_DIR = path.resolve(__dirname, '../content/generated-component-reference');
const UTIL_REF_DIR = path.resolve(__dirname, '../content/generated-util-reference');

function readComponentRefJson(componentName) {
  const kebab = kebabCase(componentName);
  const filePath = path.join(COMPONENT_REF_DIR, `${kebab}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Remark plugin that tracks headings wrapped in FrameworkCase or StyleCase components
 * and adds conditional metadata to them.
 *
 * Also detects `<ComponentReference>` components and injects heading metadata from
 * generated JSON, so component-rendered headings appear in the table of contents.
 */
export default function remarkConditionalHeadings() {
  return (tree, file) => {
    const headingsWithMetadata = [];
    const slugger = new GithubSlugger();
    const reservedSlugs = new Set();

    // Process the tree with a stateful visitor
    function visitWithContext(node, context = { frameworks: null, styles: null }) {
      // Handle FrameworkCase and StyleCase components
      if (node.type === 'mdxJsxFlowElement') {
        if (node.name === 'FrameworkCase') {
          const frameworksAttr = node.attributes?.find((attr) => attr.name === 'frameworks');
          const frameworks = extractArrayValue(frameworksAttr);

          // Create new context for children
          const newContext = { ...context, frameworks };

          // Visit children with new context
          if (node.children) {
            node.children.forEach((child) => visitWithContext(child, newContext));
          }

          return;
        } else if (node.name === 'StyleCase') {
          const stylesAttr = node.attributes?.find((attr) => attr.name === 'styles');
          const styles = extractArrayValue(stylesAttr);

          // Create new context for children
          const newContext = { ...context, styles };

          // Visit children with new context
          if (node.children) {
            node.children.forEach((child) => visitWithContext(child, newContext));
          }

          return;
        } else if (node.name === 'ComponentReference') {
          injectComponentReferenceHeadings(node, headingsWithMetadata, reservedSlugs);
        } else if (node.name === 'UtilReference') {
          injectUtilReferenceHeadings(node, headingsWithMetadata, reservedSlugs);
          return;
        }
      }

      // Handle headings
      if (node.type === 'heading') {
        const text = extractText(node);
        let slug = slugger.slug(text);

        // Avoid collisions with explicit API reference ids.
        while (reservedSlugs.has(slug)) {
          slug = slugger.slug(text);
        }
        reservedSlugs.add(slug);

        const metadata = {
          depth: node.depth,
          text,
          slug,
        };

        // Add conditional context if present
        if (context.frameworks) {
          metadata.frameworks = context.frameworks;
        }
        if (context.styles) {
          metadata.styles = context.styles;
        }

        headingsWithMetadata.push(metadata);
      }

      // Recursively visit children for other node types
      if (node.children) {
        node.children.forEach((child) => visitWithContext(child, context));
      }
    }

    // Start visiting from root
    if (tree.children) {
      tree.children.forEach((child) => visitWithContext(child));
    }

    // Attach to file data for retrieval via remarkPluginFrontmatter
    if (!file.data.astro) {
      file.data.astro = {};
    }
    if (!file.data.astro.frontmatter) {
      file.data.astro.frontmatter = {};
    }
    file.data.astro.frontmatter.conditionalHeadings = headingsWithMetadata;
  };
}

/**
 * Inject heading metadata from generated API reference JSON.
 *
 * For multi-part components, injects framework-conditional part headings.
 * For single-part components, injects "API reference".
 * For each, injects Props/State/Data attributes headings
 */
function injectComponentReferenceHeadings(node, headingsWithMetadata, reservedSlugs) {
  const componentAttr = node.attributes?.find((a) => a.name === 'component');
  const componentName = typeof componentAttr?.value === 'string' ? componentAttr.value : null;
  if (!componentName) return;

  const json = readComponentRefJson(componentName);
  if (!json) return;

  const componentModel = createComponentReferenceModel(componentName, json);
  const componentHeadings = buildComponentReferenceTocHeadings(componentModel);

  headingsWithMetadata.push(...componentHeadings);
  for (const heading of componentHeadings) {
    reservedSlugs.add(heading.slug);
  }
}

function readUtilRefJson(slug) {
  const filePath = path.join(UTIL_REF_DIR, `${slug}.json`);
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return null;
  }
}

function injectUtilReferenceHeadings(node, headingsWithMetadata, reservedSlugs) {
  const utilAttr = node.attributes?.find((a) => a.name === 'util');
  const utilName = typeof utilAttr?.value === 'string' ? utilAttr.value : null;
  if (!utilName) return;

  const slugAttr = node.attributes?.find((a) => a.name === 'slug');
  const slugValue = typeof slugAttr?.value === 'string' ? slugAttr.value : null;

  const json = readUtilRefJson(slugValue ?? kebabCase(utilName));
  if (!json) return;

  const utilModel = createUtilReferenceModel(utilName, json);
  const utilHeadings = buildUtilReferenceTocHeadings(utilModel);

  headingsWithMetadata.push(...utilHeadings);
  for (const heading of utilHeadings) {
    reservedSlugs.add(heading.slug);
  }
}

/**
 * Extract array value from JSX attribute like frameworks={["react", "html"]}
 */
function extractArrayValue(attr) {
  if (!attr || !attr.value) {
    return null;
  }

  // Handle JSX expression
  if (attr.value.type === 'mdxJsxAttributeValueExpression') {
    const expression = attr.value.value;
    try {
      // Parse the array from the expression
      // This is a simple approach that works for basic arrays
      return JSON.parse(expression.trim());
    } catch (e) {
      console.warn(`Failed to parse JSX expression: ${expression}`, e);
      return null;
    }
  }

  return null;
}

/**
 * Extract text content from a heading node
 */
function extractText(node) {
  if (node.type === 'text') {
    return node.value;
  }

  if (node.type === 'inlineCode') {
    return node.value;
  }

  if (node.children) {
    return node.children.map((child) => extractText(child)).join('');
  }

  return '';
}
