import { format, type FormatConfig } from 'oxfmt';

export interface EditableSource {
  readonly path: string;
  readonly content: string;
}

export type SourceFormatter = (source: EditableSource) => string | Promise<string>;

export type OxfmtSourceConfig = FormatConfig | ((path: string) => FormatConfig);

/** Create a formatter for editable compiler output using Oxfmt. */
export function createOxfmtSourceFormatter(config: OxfmtSourceConfig = {}): SourceFormatter {
  return async ({ path, content }) => {
    const result = await format(path, content, typeof config === 'function' ? config(path) : config);

    if (result.errors.length > 0) {
      const messages = result.errors.map((error) => error.message).join('\n');

      throw new Error(`Could not format generated source \`${path}\`:\n${messages}`);
    }

    return result.code;
  };
}
