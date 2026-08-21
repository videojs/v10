const HTML_ATTRIBUTE_ALIASES: Readonly<Record<string, string>> = {
  className: 'class',
  htmlFor: 'for',
  xlinkActuate: 'xlink:actuate',
  xlinkArcrole: 'xlink:arcrole',
  xlinkHref: 'xlink:href',
  xlinkRole: 'xlink:role',
  xlinkShow: 'xlink:show',
  xlinkTitle: 'xlink:title',
  xlinkType: 'xlink:type',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  xmlnsXlink: 'xmlns:xlink',
};

const CASE_SENSITIVE_SVG_ATTRIBUTES = new Set(
  'attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan'.split(
    ' '
  )
);

/** Convert a JSX property name to the attribute emitted by the HTML target. */
export function htmlAttributeName(name: string): string {
  return (
    HTML_ATTRIBUTE_ALIASES[name] ??
    (CASE_SENSITIVE_SVG_ATTRIBUTES.has(name) ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))
  );
}
