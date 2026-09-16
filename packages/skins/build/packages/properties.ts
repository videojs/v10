import { type Rule, transform } from 'lightningcss';

/** Keep property registrations and their conditions for the host document. */
export function propertyStyles(css: string): string {
  const { code } = transform({
    filename: 'properties.css',
    code: Buffer.from(css),
    visitor: {
      StyleSheet(sheet) {
        sheet.rules = properties(sheet.rules);
        return sheet;
      },
    },
  });

  return code.toString();
}

function properties(rules: Rule[]): Rule[] {
  return rules.filter((rule) => {
    switch (rule.type) {
      case 'property':
        return true;
      case 'media':
      case 'supports':
      case 'layer-block':
      case 'container':
      case 'scope':
      case 'starting-style':
      case 'moz-document':
        rule.value.rules = properties(rule.value.rules);
        return rule.value.rules.length > 0;
      default:
        return false;
    }
  });
}
