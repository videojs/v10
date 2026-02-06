import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { kebabCase } from 'es-toolkit/string';
import GithubSlugger from 'github-slugger';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API_REF_DIR = path.resolve(__dirname, '../content/generated-api-reference');

function readApiRefJson(componentName) {
  const kebab = kebabCase(componentName);
  const filePath = path.join(API_REF_DIR, `${kebab}.json`);
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
 * Also detects `<ApiReference>` components and injects heading metadata from
 * generated JSON, so component-rendered headings appear in the table of contents.
 */
export default function remarkConditionalHeadings() {
  return (tree, file) => {
    const headingsWithMetadata = [];
    const slugger = new GithubSlugger();

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
        } else if (node.name === 'ApiReference') {
          injectApiReferenceHeadings(node, slugger, headingsWithMetadata);
          return;
        }
      }

      // Handle headings
      if (node.type === 'heading') {
        const text = extractText(node);
        const metadata = {
          depth: node.depth,
          text,
          slug: slugger.slug(text),
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
function injectApiReferenceHeadings(node, slugger, headingsWithMetadata) {
  const componentAttr = node.attributes?.find((a) => a.name === 'component');
  const componentName = typeof componentAttr?.value === 'string' ? componentAttr.value : null;
  if (!componentName) return;

  const json = readApiRefJson(componentName);
  if (!json) return;

  if (json.parts && Object.keys(json.parts).length > 0) {
    for (const [partKebab, part] of Object.entries(json.parts)) {
      const tagName = part.platforms?.html?.tagName;
      const partKebabSlug = slugger.slug(partKebab);
      headingsWithMetadata.push({
        depth: 2,
        text: `<${componentName}.${part.name} /> reference`,
        slug: partKebabSlug,
        frameworks: ['react'],
      });
      headingsWithMetadata.push({
        depth: 2,
        text: `${tagName ? `<${tagName}>` : part.name} reference`,
        slug: partKebabSlug,
        frameworks: ['html'],
      });
      if (part.props && Object.keys(part.props).length > 0) {
        headingsWithMetadata.push({ depth: 3, text: 'Props', slug: slugger.slug('Props') });
      }
      if (part.state && Object.keys(part.state).length > 0) {
        headingsWithMetadata.push({ depth: 3, text: 'State', slug: slugger.slug('State') });
      }
      if (part.dataAttributes && Object.keys(part.dataAttributes).length > 0) {
        headingsWithMetadata.push({ depth: 3, text: 'Data attributes', slug: slugger.slug('Data attributes') });
      }
    }
  } else {
    headingsWithMetadata.push({ depth: 2, text: 'API reference', slug: slugger.slug('API reference') });
    if (json.props && Object.keys(json.props).length > 0) {
      headingsWithMetadata.push({ depth: 3, text: 'Props', slug: slugger.slug('Props') });
    }
    if (json.state && Object.keys(json.state).length > 0) {
      headingsWithMetadata.push({ depth: 3, text: 'State', slug: slugger.slug('State') });
    }
    if (json.dataAttributes && Object.keys(json.dataAttributes).length > 0) {
      headingsWithMetadata.push({ depth: 3, text: 'Data attributes', slug: slugger.slug('Data attributes') });
    }
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
