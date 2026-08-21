import { camelCase, kebabCase } from 'es-toolkit/string';

export function getPropReferenceNames(
  name: string,
  attribute: string | undefined,
  showAttributeName = false
): { propertyName: string; attributeName: string | undefined } {
  return {
    propertyName: showAttributeName && attribute ? camelCase(attribute) : name,
    attributeName: showAttributeName ? (attribute ?? kebabCase(name)) : undefined,
  };
}
