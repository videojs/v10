import { format } from 'oxfmt';

export interface FormattedSource {
  readonly code: string;
  readonly errors: readonly { readonly message: string }[];
}

/** Format generated source with the repository's portable source conventions. */
export function formatGeneratedSource(filename: string, source: string): Promise<FormattedSource> {
  return format(filename, source, {
    arrowParens: 'always',
    bracketSpacing: true,
    jsdoc: true,
    printWidth: 120,
    semi: true,
    singleQuote: !filename.endsWith('.css'),
    sortImports: true,
    tabWidth: 2,
    trailingComma: 'es5',
  });
}
