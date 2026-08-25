const HTML_ATTRIBUTE_ALIASES = {
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
} satisfies Readonly<Record<string, string>>;

const CASE_SENSITIVE_SVG_ATTRIBUTES = new Set(
  'attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan'.split(
    ' '
  )
);

function isHtmlAttributeAlias(name: string): name is keyof typeof HTML_ATTRIBUTE_ALIASES {
  return name in HTML_ATTRIBUTE_ALIASES;
}

/** Convert a JSX property name to the attribute emitted by the HTML target. */
export function htmlAttributeName(name: string): string {
  return (
    (isHtmlAttributeAlias(name) ? HTML_ATTRIBUTE_ALIASES[name] : undefined) ??
    (CASE_SENSITIVE_SVG_ATTRIBUTES.has(name) ? name : name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`))
  );
}
