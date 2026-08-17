import ts from 'typescript';

export interface InterfacePropertySpec {
  name: string;
  type: ts.TypeNode;
  optional?: boolean | undefined;
  readonly?: boolean | undefined;
}

export interface InterfaceDeclarationOptions {
  name: string;
  export?: boolean | undefined;
  extends?: readonly ts.TypeReferenceNode[] | undefined;
  properties?: readonly InterfacePropertySpec[] | undefined;
}

/** Create an interface declaration from type nodes without exposing TypeScript factory ceremony. */
export function createInterfaceDeclaration(
  options: InterfaceDeclarationOptions,
  factory: ts.NodeFactory = ts.factory
): ts.InterfaceDeclaration {
  const modifiers = options.export ? [factory.createModifier(ts.SyntaxKind.ExportKeyword)] : undefined;
  const heritageClauses = options.extends?.length
    ? [
        factory.createHeritageClause(
          ts.SyntaxKind.ExtendsKeyword,
          options.extends.map((type) =>
            factory.createExpressionWithTypeArguments(entityNameExpression(type.typeName, factory), type.typeArguments)
          )
        ),
      ]
    : undefined;
  const members = (options.properties ?? []).map((property) =>
    factory.createPropertySignature(
      property.readonly ? [factory.createModifier(ts.SyntaxKind.ReadonlyKeyword)] : undefined,
      property.name,
      property.optional ? factory.createToken(ts.SyntaxKind.QuestionToken) : undefined,
      property.type
    )
  );
  return factory.createInterfaceDeclaration(modifiers, options.name, undefined, heritageClauses, members);
}

/** Create a named type with optional generic arguments. */
export function createNamedType(
  name: string | ts.EntityName,
  typeArguments: readonly ts.TypeNode[] = [],
  factory: ts.NodeFactory = ts.factory
): ts.TypeReferenceNode {
  return factory.createTypeReferenceNode(name, typeArguments);
}

/** Create a string, number, or boolean literal type. */
export function createLiteralType(
  value: string | number | boolean,
  factory: ts.NodeFactory = ts.factory
): ts.LiteralTypeNode {
  const literal =
    typeof value === 'string'
      ? factory.createStringLiteral(value)
      : typeof value === 'number'
        ? factory.createNumericLiteral(value)
        : value
          ? factory.createTrue()
          : factory.createFalse();
  return factory.createLiteralTypeNode(literal);
}

/** Create an indexed-access type such as `Props['render']`. */
export function createIndexedAccessType(
  object: ts.TypeNode,
  index: ts.TypeNode,
  factory: ts.NodeFactory = ts.factory
): ts.IndexedAccessTypeNode {
  return factory.createIndexedAccessTypeNode(object, index);
}

function entityNameExpression(name: ts.EntityName, factory: ts.NodeFactory): ts.Expression {
  if (ts.isIdentifier(name)) return factory.createIdentifier(name.text);
  return factory.createPropertyAccessExpression(
    entityNameExpression(name.left, factory),
    factory.createIdentifier(name.right.text)
  );
}
