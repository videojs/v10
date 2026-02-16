import { describe, expect, it } from 'vitest';
import { buildComponentReferenceTocHeadings, createComponentReferenceModel } from '../componentReferenceModel';

describe('createComponentReferenceModel', () => {
  it('builds a single-part model with H3 sections for present data only', () => {
    const apiReference = {
      name: 'PlayButton',
      props: {
        size: {
          type: 'string',
        },
      },
      state: {
        pressed: {
          type: 'boolean',
        },
      },
      dataAttributes: {},
      platforms: {},
    };

    const model = createComponentReferenceModel('PlayButton', apiReference);

    expect(model).toMatchObject({
      hasParts: false,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      sections: [
        {
          key: 'props',
          title: 'Props',
          id: 'props',
          depth: 3,
        },
        {
          key: 'state',
          title: 'State',
          id: 'state',
          depth: 3,
        },
      ],
    });
  });

  it('builds a multi-part model with framework-specific labels and H4 section ids', () => {
    const apiReference = {
      name: 'Controls',
      props: {},
      state: {},
      dataAttributes: {},
      platforms: {},
      parts: {
        root: {
          name: 'Root',
          description: 'Root part',
          props: {},
          state: {
            visible: {
              type: 'boolean',
            },
          },
          dataAttributes: {
            'data-visible': {
              description: 'Visible',
            },
          },
          platforms: {
            html: {
              tagName: 'media-controls',
            },
          },
        },
        group: {
          name: 'Group',
          props: {},
          state: {},
          dataAttributes: {},
          platforms: {},
        },
      },
    };

    const model = createComponentReferenceModel('Controls', apiReference);

    expect(model).toMatchObject({
      hasParts: true,
      heading: {
        id: 'api-reference',
        depth: 2,
        text: 'API Reference',
      },
      parts: [
        {
          id: 'root',
          labelByFramework: {
            react: 'Root',
            html: 'media-controls',
          },
          componentName: 'Controls.Root',
          sections: [
            {
              key: 'state',
              title: 'State',
              id: 'root-state',
              depth: 4,
              tocKind: 'api-reference-subsection',
            },
            {
              key: 'dataAttributes',
              title: 'Data attributes',
              id: 'root-data-attributes',
              depth: 4,
              tocKind: 'api-reference-subsection',
            },
          ],
        },
        {
          id: 'group',
          labelByFramework: {
            react: 'Group',
            html: 'Group',
          },
          componentName: 'Controls.Group',
          sections: [],
        },
      ],
    });
  });
});

describe('buildComponentReferenceTocHeadings', () => {
  it('creates TOC headings with API H4 metadata for multi-part sections', () => {
    const apiReference = {
      name: 'Controls',
      props: {},
      state: {},
      dataAttributes: {},
      platforms: {},
      parts: {
        root: {
          name: 'Root',
          props: {},
          state: {
            visible: {
              type: 'boolean',
            },
          },
          dataAttributes: {
            'data-visible': {
              description: 'Visible',
            },
          },
          platforms: {
            html: {
              tagName: 'media-controls',
            },
          },
        },
      },
    };

    const model = createComponentReferenceModel('Controls', apiReference);
    const headings = buildComponentReferenceTocHeadings(model);

    expect(headings).toEqual([
      {
        depth: 2,
        text: 'API Reference',
        slug: 'api-reference',
      },
      {
        depth: 3,
        text: 'Root',
        slug: 'root',
        frameworks: ['react'],
      },
      {
        depth: 3,
        text: 'media-controls',
        slug: 'root',
        frameworks: ['html'],
      },
      {
        depth: 4,
        text: 'State',
        slug: 'root-state',
        tocKind: 'api-reference-subsection',
      },
      {
        depth: 4,
        text: 'Data attributes',
        slug: 'root-data-attributes',
        tocKind: 'api-reference-subsection',
      },
    ]);
  });
});
