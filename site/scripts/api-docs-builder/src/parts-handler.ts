import { formatDetailedType } from './formatter.js';
import type { OxcProject } from './oxc-project.js';
import { getJSDoc, getJSDocDescription, staticName } from './oxc-project.js';
import type { PropDef } from './types.js';

export interface PartExport {
  name: string;
  localName: string;
  source: string;
}

/** Extract value re-exports from a React index.parts.ts file. */
export function extractParts(filePath: string, project: OxcProject): PartExport[] {
  const file = project.source(filePath);
  if (!file) return [];

  const parts: PartExport[] = [];

  for (const statement of file.program.body) {
    if (statement.type !== 'ExportNamedDeclaration' || !statement.source || statement.exportKind === 'type') continue;

    for (const specifier of statement.specifiers) {
      if (specifier.exportKind === 'type') continue;

      parts.push({
        name: moduleName(specifier.exported),
        localName: moduleName(specifier.local),
        source: statement.source.value,
      });
    }
  }

  return parts;
}

/** Extract the declaration JSDoc for a React part. */
export function extractPartDescription(filePath: string, project: OxcProject, partName: string): string | undefined {
  const resolved = project.resolveExport(filePath, partName) ?? project.resolveName(filePath, partName);
  let description = resolved ? getJSDocDescription(resolved.file, resolved.declaration) : undefined;

  if (description) description = description.replace(/\n*@example[\s\S]*$/, '').trim();

  return description || undefined;
}

/** Extract project-local custom props from a React sub-part interface. */
export function extractSubPartProps(filePath: string, project: OxcProject, localName: string): Record<string, PropDef> {
  const declaration = project.resolveName(filePath, `${localName}Props`);
  const name = declaration && 'id' in declaration.declaration ? staticName(declaration.declaration.id) : undefined;
  if (!declaration || !name) return {};

  const type: import('oxc-parser').TSTypeReference = {
    type: 'TSTypeReference',
    typeName: { type: 'Identifier', name, start: declaration.declaration.start, end: declaration.declaration.end },
    typeArguments: null,
    start: declaration.declaration.start,
    end: declaration.declaration.end,
  };
  const props: Record<string, PropDef> = {};

  for (const resolved of project.interfaceMembers({ file: declaration.file, type })) {
    if (resolved.member.type !== 'TSPropertySignature' || !resolved.member.typeAnnotation) continue;

    const name = staticName(resolved.member.key);
    if (!name) continue;

    const documentation = getJSDoc(resolved.file, resolved.member);
    if (name === 'children' && !documentation?.description) continue;

    const formatted = formatDetailedType(
      project,
      {
        file: resolved.file,
        type: resolved.member.typeAnnotation.typeAnnotation,
        ...(resolved.substitutions ? { substitutions: resolved.substitutions } : {}),
      },
      resolved.member.optional
    );
    const definition: PropDef = { type: formatted, frameworks: ['react'] };

    if (documentation?.description) definition.description = documentation.description;

    props[name] = definition;
  }

  return props;
}

function moduleName(name: import('oxc-parser').ModuleExportName): string {
  return name.type === 'Literal' ? String(name.value) : name.name;
}
