import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { iconNames } from '../../vjsc/icon-names.js';
import { ASSETS_DIR, getIconSets, getSvgFiles } from '../internal/paths.js';
import { optimizeSvg } from '../internal/svg.js';

export interface IconDefinition {
  readonly name: string;
  readonly pascalName: string;
  readonly camelName: string;
  readonly svg: string;
}

export interface IconFamily {
  readonly name: string;
  readonly icons: readonly IconDefinition[];
}

export function loadIconFamilies(): IconFamily[] {
  return getIconSets().map((family) => {
    const files = getSvgFiles(family);
    if (files.length === 0) throw new Error(`Icon family \`${family}\` does not contain any SVG assets.`);

    return {
      name: family,
      icons: files.map((file) => {
        const name = file.replace(/\.svg$/, '');
        const { pascal, camel } = iconNames(name);

        return {
          name,
          pascalName: pascal,
          camelName: camel,
          svg: optimizeSvg(readFileSync(join(ASSETS_DIR, family, file), 'utf8')),
        };
      }),
    };
  });
}
