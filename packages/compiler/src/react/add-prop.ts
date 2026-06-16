import ts from 'typescript';
import type { JsxElementLike, Matcher } from '../matchers';
import { type AddImportContext, addNamedImport } from '../transforms/add-import';

export interface AddPropImportRef {
  source: string;
  name: string;
  /** `'jsx'` emits `<Imported/>` as the value; `'ref'` emits `Imported`. Defaults to `'jsx'`. */
  kind?: 'jsx' | 'ref';
}

export interface AddPropOptions {
  match: Matcher;
  prop: string;
  value: ts.Expression | AddPropImportRef;
  /** When the matched element already has the prop set: skip by default; set to `true` to force overwrite. */
  overwrite?: boolean;
}

/**
 * For elements matching `match`, set `prop` to `value`. `value` is either a
 * literal expression or an `ImportRef`. With `kind: 'jsx'` (default) the
 * compiler emits `<prop>={<Imported/>}`; with `kind: 'ref'` it emits
 * `<prop>={Imported}`. Either form auto-adds the import.
 *
 * Default behavior skips matches whose `prop` is already present;
 * `overwrite: true` forces replacement.
 */
export function addProp(opts: AddPropOptions, ctx: AddImportContext = {}): ts.TransformerFactory<ts.SourceFile> {
  return (context) => {
    const factory = context.factory;
    let needsImport: AddPropImportRef | null = null;

    const buildAttribute = (): ts.JsxAttribute => {
      const expr = isImportRef(opts.value) ? buildRefExpression(opts.value, factory) : opts.value;
      return factory.createJsxAttribute(
        factory.createIdentifier(opts.prop),
        factory.createJsxExpression(undefined, expr)
      );
    };

    const visit = (node: ts.Node): ts.Node => {
      const out = ts.visitEachChild(node, visit, context);
      if (!ts.isJsxElement(out) && !ts.isJsxSelfClosingElement(out)) return out;
      if (!opts.match(out as JsxElementLike)) return out;

      const attrs = ts.isJsxElement(out) ? out.openingElement.attributes : out.attributes;
      const existingIdx = attrs.properties.findIndex(
        (p) => ts.isJsxAttribute(p) && ts.isIdentifier(p.name) && p.name.text === opts.prop
      );
      if (existingIdx !== -1 && !opts.overwrite) return out;

      if (isImportRef(opts.value)) needsImport = opts.value;
      const newAttribute = buildAttribute();
      const nextProperties =
        existingIdx === -1
          ? [...attrs.properties, newAttribute]
          : attrs.properties.map((p, i) => (i === existingIdx ? newAttribute : p));
      const newAttrs = factory.createJsxAttributes(nextProperties);

      if (ts.isJsxSelfClosingElement(out)) {
        return factory.createJsxSelfClosingElement(out.tagName, out.typeArguments, newAttrs);
      }
      return factory.createJsxElement(
        factory.createJsxOpeningElement(out.openingElement.tagName, out.openingElement.typeArguments, newAttrs),
        out.children,
        out.closingElement
      );
    };

    return (sourceFile) => {
      let result = ts.visitEachChild(sourceFile, visit, context);
      if (needsImport) {
        result = addNamedImport(result, { source: needsImport.source, name: needsImport.name }, factory, ctx);
      }
      return result;
    };
  };
}

function isImportRef(value: ts.Expression | AddPropImportRef): value is AddPropImportRef {
  return typeof (value as AddPropImportRef).source === 'string' && typeof (value as AddPropImportRef).name === 'string';
}

function buildRefExpression(ref: AddPropImportRef, factory: ts.NodeFactory): ts.Expression {
  const id = factory.createIdentifier(ref.name);
  if ((ref.kind ?? 'jsx') === 'ref') return id;
  return factory.createJsxSelfClosingElement(id, undefined, factory.createJsxAttributes([]));
}
