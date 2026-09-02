import type { Skin, Styling } from '@app/types';

import { authoredExportName, loadAuthoredSkinModule } from '../authored-skins';
import { defineTemplateSkin, type SkinTemplate } from './registry-skins';
import { authoredSkinTag, type SkinPreset } from './skin-tags';

/** What a compiled html skin module exports: a render function whose result serialises to markup around a `<slot>`. */
type HtmlSkinRender = (props?: { className?: string }) => { toString(): string };

function skinRender(module: object, name: string): HtmlSkinRender {
  // SAFETY: a module namespace is a plain object keyed by export name; the value is checked below.
  const render = (module as Record<string, unknown>)[name];
  if (typeof render !== 'function') throw new Error(`Authored skin module did not export ${name}.`);

  // SAFETY: the html target exports its skin as a function that renders to a string-like value.
  return render as HtmlSkinRender;
}

/** Compiled html output keeps the authored `<slot>` for the media and a named `<slot>` for the poster. */
const authoredTemplate = (markup: string): SkinTemplate => ({
  markup,
  media: (container) => container.querySelector('slot:not([name])'),
  poster: (container) => container.querySelector('slot[name="poster"]'),
});

/** Compile an authored html skin, define the element that renders it around the page's media, and return its tag. */
export async function loadAuthoredHtmlSkinTag(preset: SkinPreset, skin: Skin, styling: Styling): Promise<string> {
  const tagName = authoredSkinTag(preset, skin, styling);
  if (customElements.get(tagName)) return tagName;

  const module = await loadAuthoredSkinModule('html', preset, skin, styling);
  const render = skinRender(module, authoredExportName(preset, skin));

  return defineTemplateSkin(tagName, authoredTemplate(String(render())));
}
