import { camelCase, kebabCase } from 'es-toolkit/string';

export function getPropReferenceNames(name: string, attribute: string | undefined, showAttributeName = false) {
  return {
    propertyName: showAttributeName && attribute ? camelCase(attribute) : name,
    attributeName: showAttributeName ? (attribute ?? kebabCase(name)) : undefined,
  } satisfies { propertyName: string; attributeName: string | undefined };
}
