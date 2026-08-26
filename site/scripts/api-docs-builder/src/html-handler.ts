import { collectDispatchedEvents, collectFires } from './event-handler.js';
import type { OxcProject } from './oxc-project.js';
import { staticName, unwrapExpression, unwrapObjectExpression } from './oxc-project.js';
import type { HtmlExtraction } from './types.js';

/** Extract tagName and reactive properties from an HTML element class. */
export function extractHtml(
  filePath: string,
  project: OxcProject,
  componentName: string,
  elementName?: string
): HtmlExtraction | null {
  const className = elementName ?? `${componentName}Element`;
  const hierarchy = project.classHierarchy(filePath, className);
  if (hierarchy.length === 0) return null;

  let tagName = '';
  const properties = new Set<string>();

  for (const resolved of hierarchy) {
    for (const member of resolved.declaration.body.body) {
      if (member.type !== 'PropertyDefinition' || !member.static) continue;

      const name = staticName(member.key);

      if (name === 'tagName' && member.value) {
        const value = unwrapExpression(member.value);

        if (value.type === 'Literal' && typeof value.value === 'string') tagName = value.value;
      }

      if (name !== 'properties') continue;

      const object = unwrapObjectExpression(member.value);
      if (!object) continue;

      for (const property of object.properties) {
        if (property.type !== 'Property' || property.kind !== 'init') continue;

        const propertyName = staticName(property.key);
        if (!propertyName) continue;

        const declaration = unwrapObjectExpression(property.value);
        const excludesAttribute = declaration?.properties.some((entry) => {
          if (entry.type !== 'Property' || entry.kind !== 'init' || staticName(entry.key) !== 'attribute') return false;

          const value = unwrapExpression(entry.value);

          return value.type === 'Literal' && value.value === false;
        });

        if (!excludesAttribute) properties.add(propertyName);
      }
    }
  }

  const files = [...new Set(hierarchy.map(({ file }) => file.filePath))];
  const fires = collectFires(files, project);
  const events = [...collectDispatchedEvents(files, project)]
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const description = fires.get(name);

      return description ? { name, description } : { name };
    });

  return tagName ? { tagName, properties: [...properties], events } : null;
}
