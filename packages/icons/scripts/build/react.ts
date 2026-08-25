import { join } from 'node:path';

import { transform } from '@svgr/core';
import { transformSync } from 'oxc-transform';

import { DIST_DIR } from '../internal/paths.js';
import type { IconDefinition, IconFamily } from './model.js';
import { writeOutput } from './output.js';

const transformOptions: Parameters<typeof transform>[1] = {
  plugins: ['@svgr/plugin-jsx'],
  jsxRuntime: 'automatic',
  ref: true,
};

async function buildComponent(icon: IconDefinition): Promise<string> {
  const componentName = `${icon.pascalName}Icon`;
  const jsx = await transform(icon.svg, transformOptions, { componentName });
  const result = transformSync(`${componentName}.jsx`, jsx, {
    lang: 'jsx',
    sourceType: 'module',
    jsx: { runtime: 'automatic' },
  });

  if (result.errors.length > 0 || !result.code) {
    const errors = result.errors.map((error) => error.codeframe ?? error.message).join('\n');

    throw new Error(`Could not transpile ${componentName}:\n${errors}`);
  }

  return result.code;
}

export async function emitReactFamily({ name: family, icons }: IconFamily): Promise<void> {
  const directory = join(DIST_DIR, 'react', family);

  for (const icon of icons) {
    const componentName = `${icon.pascalName}Icon`;

    writeOutput(join(directory, `${icon.name}.js`), await buildComponent(icon));
    writeOutput(
      join(directory, `${icon.name}.d.ts`),
      [
        `import * as React from 'react';`,
        `declare const ${componentName}: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;`,
        `export default ${componentName};`,
        ``,
      ].join('\n')
    );
  }

  writeOutput(
    join(directory, 'index.js'),
    `${icons.map(({ name, pascalName }) => `export { default as ${pascalName}Icon } from './${name}.js';`).join('\n')}\n`
  );
  writeOutput(
    join(directory, 'index.d.ts'),
    [
      `import type * as React from 'react';`,
      ...icons.map(
        ({ pascalName }) =>
          `export declare const ${pascalName}Icon: React.ForwardRefExoticComponent<React.SVGProps<SVGSVGElement> & React.RefAttributes<SVGSVGElement>>;`
      ),
      ``,
    ].join('\n')
  );
}
