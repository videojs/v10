import { join } from 'node:path';

import { DIST_DIR } from '../internal/paths.js';
import type { IconFamily } from './model.js';
import { writeOutput } from './output.js';

export function emitVjscFamily({ name: family, icons }: IconFamily): void {
  const components = icons.map(
    ({ pascalName }) => `export const ${pascalName}Icon = createComponent({ name: '${pascalName}Icon' });`
  );
  const types = icons.map(({ pascalName }) => `export declare const ${pascalName}Icon: Component<EmptyProps>;`);
  const directory = join(DIST_DIR, 'vjsc', family);

  writeOutput(
    join(directory, 'index.js'),
    [`import { createComponent } from 'vjsc/components';`, ``, ...components, ``].join('\n')
  );
  writeOutput(
    join(directory, 'index.d.ts'),
    [`import type { Component, EmptyProps } from 'vjsc/components';`, ``, ...types, ``].join('\n')
  );
}
