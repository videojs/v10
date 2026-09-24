/** Find the one-based lines containing a key fragment that should stand out in a generated code sample. */
export function focusLinesContaining(code: string, fragments: readonly string[]): number[] {
  return code
    .split('\n')
    .flatMap((line, index) => (fragments.some((fragment) => line.includes(fragment)) ? [index + 1] : []));
}
