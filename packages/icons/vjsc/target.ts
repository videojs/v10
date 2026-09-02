import { ModuleImports } from '../../vjsc/src/ast/index.ts';
import type { ComponentSchema } from '../../vjsc/src/components/index.ts';
import {
  type ComponentTarget,
  defineComponentTarget,
  type SourceProps,
  type TargetTransform,
} from '../../vjsc/src/target/index.ts';
import { jsx } from '../../vjsc/src/target/jsx-runtime.ts';
import { iconNames } from './icon-names.ts';

export interface IconTargetOptions {
  readonly family?: string | undefined;
}

const htmlIconNames: Readonly<Record<string, string>> = {
  AirPlayEnterIcon: 'airplay-enter',
  AirPlayExitIcon: 'airplay-exit',
};

export function createHtmlIconTarget(options: IconTargetOptions = {}): ComponentTarget<ComponentSchema> {
  const family = options.family ?? 'default';

  return defineComponentTarget<ComponentSchema>()(({ element }) => {
    const Icon = element('media-icon');

    return {
      source: '@videojs/icons/vjsc',
      components: {
        resolve:
          ({ component }) =>
          ({ props }: { props: SourceProps<Record<string, unknown>> }) =>
            jsx(Icon, {
              ...props,
              ...(family === 'default' ? {} : { family }),
              name: htmlIconName(component),
            }),
      },
      transforms: [iconRegistration(family)],
      jsx: {
        importSource: 'vjsc/html-runtime',
        attributes: 'html',
        host: {
          from: 'vjsc/html-runtime/jsx-runtime',
          name: 'Host',
        },
        scope: {
          from: 'vjsc/html-runtime/jsx-runtime',
          name: 'Scope',
        },
      },
    };
  });
}

export function createReactIconTarget(options: IconTargetOptions = {}): ComponentTarget<ComponentSchema> {
  const family = options.family ?? 'default';

  return defineComponentTarget<ComponentSchema>()(({ imported }) => ({
    source: '@videojs/icons/vjsc',
    components: {
      resolve: ({ component }) => {
        const source = family === 'default' ? '@videojs/react/icons' : `@videojs/react/icons/${family}`;
        const Icon = imported({
          from: source,
          name: component,
          props: { from: source, name: 'IconProps' },
        });

        return ({ props }: { props: SourceProps<Record<string, unknown>> }) => jsx(Icon, { ...props });
      },
    },
    jsx: {
      importSource: 'react',
      attributes: 'react',
    },
  }));
}

function iconRegistration(family: string): TargetTransform {
  return {
    name: `videojs:html-icons:${family}`,
    transform(context) {
      const declaration = context.ast.body.find(
        (statement) => statement.type === 'ImportDeclaration' && statement.source.value === '@videojs/icons/vjsc'
      );
      if (!declaration || declaration.type !== 'ImportDeclaration') return false;

      const components = declaration.specifiers.flatMap((specifier) => {
        if (specifier.type !== 'ImportSpecifier' || specifier.importKind === 'type') return [];

        return [specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value];
      });
      if (components.length === 0) return false;

      const imports = new ModuleImports(context.ast, context.magicString, { collisionSuffix: 'Primitive' });
      const registerIcons = imports.reference({ from: '@videojs/html/icons', name: 'registerIcons' });

      const source = family === 'default' ? '@videojs/html/icons' : `@videojs/html/icons/${family}`;
      const entries = components.map((component) => {
        const name = htmlIconName(component);

        const imported = imports.reference({
          from: source,
          name: `${iconNames(name).camel}Icon`,
        });

        return `${JSON.stringify(name)}: ${imported}`;
      });

      imports.statement(`${registerIcons}(${JSON.stringify(family)}, { ${entries.join(', ')} });`);

      imports.commit();

      return true;
    },
  };
}

function htmlIconName(component: string): string {
  return (
    htmlIconNames[component] ??
    component
      .replace(/Icon$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .toLowerCase()
  );
}
