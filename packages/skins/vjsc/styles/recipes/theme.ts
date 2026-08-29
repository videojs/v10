import type { StyleValue } from 'vjsc/styles';

/** Scope a component recipe to the Default and Minimal Skin themes. */
export function themeRecipe(defaultStyles: StyleValue, minimalStyles: StyleValue): readonly string[] {
  return [...prefixTheme('theme-default', defaultStyles), ...prefixTheme('theme-minimal', minimalStyles)];
}

function prefixTheme(theme: string, styles: StyleValue): readonly string[] {
  const groups = typeof styles === 'string' ? [styles] : styles;

  return groups.map((group) =>
    group
      .split(/\s+/)
      .filter(Boolean)
      .map((utility) => `${theme}:${utility}`)
      .join(' ')
  );
}
