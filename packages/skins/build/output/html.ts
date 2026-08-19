import { html } from 'vjsc';
import { defineOutput, type StaticCatalogOutputAdapter } from 'vjsc/catalog';
import { extendRegistry } from 'vjsc/components';
import { registry as htmlRegistry } from '../../../html/vjsc';
import { registry as iconRegistry } from '../../../icons/vjsc/html';

interface HtmlOutputOptions {
  iconSet?: string | undefined;
}

/** Create the bundled HTML output adapter for a Skin catalog. */
export function htmlOutput(options: HtmlOutputOptions = {}): StaticCatalogOutputAdapter {
  const registry = extendRegistry(htmlRegistry, iconRegistry({ family: options.iconSet ?? 'default' }));

  return defineOutput({
    mode: 'bundle',
    registry,
    compiler: {
      external: (source) => source.startsWith('@videojs/html/'),
      target: html(),
    },
  });
}
