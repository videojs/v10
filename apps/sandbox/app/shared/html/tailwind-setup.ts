import tailwindCSS from '@app/styles.css?inline';

const tailwindStyles = new CSSStyleSheet();
tailwindStyles.replaceSync(tailwindCSS);

export function getTailwindStyles(): CSSStyleSheet {
  return tailwindStyles;
}
