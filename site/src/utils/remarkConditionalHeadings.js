import GithubSlugger from 'github-slugger';

/**
 * Remark plugin that tracks headings wrapped in FrameworkCase or StyleCase components
 * and adds conditional metadata to them.
 *
 * This allows filtering headings in the TOC based on the current framework/style combination.
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
