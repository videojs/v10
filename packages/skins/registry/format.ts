import { format, type FormatConfig } from 'oxfmt';

const config = {
  arrowParens: 'always',
  bracketSpacing: true,
  jsdoc: true,
  printWidth: 120,
  semi: true,
  sortImports: true,
  tabWidth: 2,
  trailingComma: 'es5',
} satisfies FormatConfig;

/** Format editable registry and package sources with the repository conventions. */
export async function formatSource(source: { readonly path: string; readonly content: string }): Promise<string> {
  if (source.path.endsWith('.html')) return source.content;

  const result = await format(source.path, source.content, {
    ...config,
    singleQuote: !source.path.endsWith('.css'),
  });

  if (result.errors.length > 0) {
    const messages = result.errors.map((error) => error.message).join('\n');

    throw new Error(`Could not format generated source \`${source.path}\`:\n${messages}`);
  }

  return result.code;
}
