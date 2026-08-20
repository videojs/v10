import ts from 'typescript';

/** Create an untyped arrow function from simple parameter names. */
export function createArrowFunction(
  parameters: readonly string[],
  body: ts.ConciseBody,
  factory: ts.NodeFactory = ts.factory
): ts.ArrowFunction {
  return factory.createArrowFunction(
    undefined,
    undefined,
    parameters.map((name) => factory.createParameterDeclaration(undefined, undefined, name)),
    undefined,
    factory.createToken(ts.SyntaxKind.EqualsGreaterThanToken),
    body
  );
}
