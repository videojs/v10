import { kebabCase } from 'es-toolkit/string';
import type { UtilOverload, UtilReference } from '@/types/util-reference';

export interface UtilReferenceSection {
  key: 'parameters' | 'returnValue';
  title: string;
  id: string;
  depth: number;
}

export interface OverloadModel {
  id: string;
  label: string | undefined;
  index: number;
  description: string | undefined;
  sections: UtilReferenceSection[];
  data: UtilOverload;
}

interface Heading {
  id: string;
  depth: number;
  text: string;
}

export interface SingleOverloadModel {
  name: string;
  description: string | undefined;
  isMultiOverload: false;
  heading: Heading;
  sections: UtilReferenceSection[];
  overload: UtilOverload;
}

export interface MultiOverloadModel {
  name: string;
  description: string | undefined;
  isMultiOverload: true;
  heading: Heading;
  overloads: OverloadModel[];
}

export type UtilReferenceModel = SingleOverloadModel | MultiOverloadModel;

export function createUtilReferenceModel(name: string, ref: UtilReference | null): UtilReferenceModel | null {
  if (!ref) {
    return null;
  }

  const isMultiOverload = ref.overloads.length > 1;

  if (isMultiOverload) {
    const overloads = ref.overloads.map((overload, index): OverloadModel => {
      const label = overload.label;
      const overloadId = label ? kebabCase(label) : `overload-${index + 1}`;
      const sections: UtilReferenceSection[] = [];

      if (Object.keys(overload.parameters).length > 0) {
        sections.push({
          key: 'parameters',
          title: 'Parameters',
          id: `${overloadId}-parameters`,
          depth: 4,
        });
      }

      sections.push({
        key: 'returnValue',
        title: 'Return Value',
        id: `${overloadId}-return-value`,
        depth: 4,
      });

      return {
        id: overloadId,
        label,
        index: index + 1,
        description: overload.description,
        sections,
        data: overload,
      };
    });

    return {
      name,
      description: ref.description,
      isMultiOverload: true,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      overloads,
    };
  }

  const overload = ref.overloads[0]!;
  const sections: UtilReferenceSection[] = [];

  if (Object.keys(overload.parameters).length > 0) {
    sections.push({
      key: 'parameters',
      title: 'Parameters',
      id: 'parameters',
      depth: 3,
    });
  }

  sections.push({
    key: 'returnValue',
    title: 'Return Value',
    id: 'return-value',
    depth: 3,
  });

  return {
    name,
    description: ref.description,
    isMultiOverload: false,
    heading: {
      id: 'api-reference',
      depth: 2,
      text: 'API Reference',
    },
    sections,
    overload,
  };
}

export function buildUtilReferenceTocHeadings(
  model: UtilReferenceModel | null
): Array<{ depth: number; text: string; slug: string }> {
  if (!model) {
    return [];
  }

  const headings: Array<{ depth: number; text: string; slug: string }> = [
    {
      depth: model.heading.depth,
      text: model.heading.text,
      slug: model.heading.id,
    },
  ];

  if (model.isMultiOverload) {
    for (const overload of model.overloads) {
      headings.push({
        depth: 3,
        text: overload.label ?? `Overload ${overload.index}`,
        slug: overload.id,
      });

      for (const section of overload.sections) {
        headings.push({
          depth: section.depth,
          text: section.title,
          slug: section.id,
        });
      }
    }

    return headings;
  }

  for (const section of model.sections) {
    headings.push({
      depth: section.depth,
      text: section.title,
      slug: section.id,
    });
  }

  return headings;
}
