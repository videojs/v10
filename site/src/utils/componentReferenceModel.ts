import type { ComponentReference, PartReference } from '@/types/component-reference';
import type { SupportedFramework } from '@/types/docs';

export interface ApiReferenceSection {
  key: string;
  title: string;
  id: string;
  depth: number;
  tocKind?: string;
}

export interface PartModel {
  id: string;
  name: string;
  description: string | undefined;
  componentName: string;
  labelByFramework: { react: string; html: string };
  frameworks: SupportedFramework[];
  sections: ApiReferenceSection[];
  data: PartReference;
}

interface ComponentReferenceModelBase {
  componentName: string;
  heading: { id: string; depth: number; text: string };
  data: ComponentReference;
}

export interface MultiPartModel extends ComponentReferenceModelBase {
  hasParts: true;
  sections: [];
  parts: PartModel[];
}

export interface SingleModel extends ComponentReferenceModelBase {
  hasParts: false;
  sections: ApiReferenceSection[];
  parts: [];
}

export type ComponentReferenceModel = MultiPartModel | SingleModel;

export interface TocHeading {
  depth: number;
  text: string;
  slug: string;
  frameworks?: SupportedFramework[];
  tocKind?: string;
}

const API_REFERENCE_SUBSECTIONS = Object.freeze([
  {
    key: 'props',
    title: 'Props',
    singleId: 'props',
    suffix: 'props',
  },
  {
    key: 'state',
    title: 'State',
    singleId: 'state',
    suffix: 'state',
  },
  {
    key: 'dataAttributes',
    title: 'Data attributes',
    singleId: 'data-attributes',
    suffix: 'data-attributes',
  },
  {
    key: 'cssCustomProperties',
    title: 'CSS custom properties',
    singleId: 'css-custom-properties',
    suffix: 'css-custom-properties',
  },
]);

export const API_REFERENCE_SUBSECTION_TITLES = Object.freeze(API_REFERENCE_SUBSECTIONS.map((section) => section.title));

function hasEntries(value: Record<string, unknown> | undefined): boolean {
  return Object.keys(value ?? {}).length > 0;
}

function createSections(
  source: PartReference | ComponentReference,
  options: { forPart: true; partId: string } | { forPart: false }
): ApiReferenceSection[] {
  return API_REFERENCE_SUBSECTIONS.flatMap((definition) => {
    if (!hasEntries(source[definition.key as keyof typeof source] as Record<string, unknown> | undefined)) {
      return [];
    }

    if (options.forPart) {
      return [
        {
          key: definition.key,
          title: definition.title,
          id: `${options.partId}-${definition.suffix}`,
          depth: 4,
          tocKind: 'api-reference-subsection',
        },
      ];
    }

    return [
      {
        key: definition.key,
        title: definition.title,
        id: definition.singleId,
        depth: 3,
      },
    ];
  });
}

export function createComponentReferenceModel(
  componentName: string,
  apiReference: ComponentReference | null,
  partOrder?: string[]
): ComponentReferenceModel | null {
  if (!apiReference) {
    return null;
  }

  const hasParts = Boolean(apiReference.parts && Object.keys(apiReference.parts).length > 0);

  if (hasParts) {
    let partEntries = Object.entries(apiReference.parts!);

    if (partOrder) {
      const orderMap = new Map(partOrder.map((id, i) => [id, i]));
      partEntries = partEntries.slice().sort((a, b) => {
        const ai = orderMap.has(a[0]) ? orderMap.get(a[0])! : Number.MAX_SAFE_INTEGER;
        const bi = orderMap.has(b[0]) ? orderMap.get(b[0])! : Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    }

    const parts: PartModel[] = partEntries.map(([partId, part]) => ({
      id: partId,
      name: part.name,
      description: part.description,
      componentName: `${componentName}.${part.name}`,
      labelByFramework: {
        react: part.name,
        html: part.platforms?.html?.tagName ?? part.name,
      },
      frameworks: [
        ...(part.platforms?.html ? ['html' as const] : []),
        ...(part.platforms?.react ? ['react' as const] : []),
      ],
      sections: createSections(part, { forPart: true, partId }),
      data: part,
    }));

    return {
      componentName,
      hasParts: true,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      sections: [],
      parts,
      data: apiReference,
    };
  }

  return {
    componentName,
    hasParts: false,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    sections: createSections(apiReference, { forPart: false }),
    parts: [],
    data: apiReference,
  };
}

export function buildComponentReferenceTocHeadings(apiReferenceModel: ComponentReferenceModel | null): TocHeading[] {
  if (!apiReferenceModel) {
    return [];
  }

  const headings: TocHeading[] = [
    {
      depth: apiReferenceModel.heading.depth,
      text: apiReferenceModel.heading.text,
      slug: apiReferenceModel.heading.id,
    },
  ];

  if (apiReferenceModel.hasParts) {
    for (const part of apiReferenceModel.parts) {
      // Only emit headings for frameworks the part supports
      if (part.frameworks.includes('react')) {
        headings.push({
          depth: 3,
          text: part.labelByFramework.react,
          slug: part.id,
          frameworks: ['react'],
        });
      }
      if (part.frameworks.includes('html')) {
        headings.push({
          depth: 3,
          text: part.labelByFramework.html,
          slug: part.id,
          frameworks: ['html'],
        });
      }

      for (const section of part.sections) {
        headings.push({
          depth: section.depth,
          text: section.title,
          slug: section.id,
          tocKind: section.tocKind,
          ...(part.frameworks.length < 2 ? { frameworks: part.frameworks } : {}),
        });
      }
    }

    return headings;
  }

  for (const section of apiReferenceModel.sections) {
    headings.push({
      depth: section.depth,
      text: section.title,
      slug: section.id,
    });
  }

  return headings;
}
