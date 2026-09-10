/**
 * Mock custom media element factory.
 *
 * Exercises: composition through the factory. The builder reads nothing from this file; native attributes come from the
 * base adapters and CSS vars from templates.ts.
 */
// Stub — the builder parses the AST, it doesn't run the code.
export function CustomMediaElement(options: { Adapter: any; host: any }) {
  return options.Adapter;
}
