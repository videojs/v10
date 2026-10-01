/** Keep packaged skin layers separate from the consumer's Tailwind layers. */
export function mediaLayers(css: string): string {
  return css.replace(/(@layer\s+)([^;{]+)/g, (_match, prefix: string, names: string) => {
    return prefix + names.replace(/(^|,\s*)(base|components|utilities)(?=[,.\s]|$)/g, '$1media.$2');
  });
}
