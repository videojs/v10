import { format, type FormatConfig } from 'oxfmt';

export interface EditableSource {
  readonly path: string;
  readonly content: string;
}

export type SourceFormatter = (source: EditableSource) => string | Promise<string>;

export interface OxfmtSourceFormatterOptions {
  readonly config?: FormatConfig | undefined;
  readonly configure?: ((path: string) => FormatConfig | null) | undefined;
}

/** Create a formatter for editable compiler output using Oxfmt. */
export function createOxfmtSourceFormatter(options: OxfmtSourceFormatterOptions = {}): SourceFormatter {
  return async ({ path, content }) => {
    const resolved = options.configure ? options.configure(path) : (options.config ?? {});
    if (resolved === null) return content;

    const result = await format(path, content, resolved);

    if (result.errors.length > 0) {
      const messages = result.errors.map((error) => error.message).join('\n');

      throw new Error(`Could not format generated source \`${path}\`:\n${messages}`);
    }

    return result.code;
  };
}
