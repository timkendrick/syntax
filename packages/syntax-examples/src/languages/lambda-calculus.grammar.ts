import {
  syntax,
  type InferSyntaxNodeType,
  type InferSyntaxNodeTypeLookup,
  type InferSyntaxRootNode,
  type InferSyntaxTokenType,
  type InferSyntaxTokenTypeLookup,
} from '@timkendrick/syntax';

// Ensure type declarations are exposed for full type inference
import './lambda-calculus.grammar.generated.d';

/**
 * Lambda Calculus Parser
 *
 * This parser implements a grammar for lambda calculus expressions, a formal system
 * in mathematical logic for expressing computation based on function abstraction
 * and application.
 *
 * Supported syntax:
 * - x                // Variable
 * - λx.x             // Lambda definition
 * - (λx.x y)         // Function application (requires parentheses)
 * - (λx.λy.(x y) f)  // Function currying
 *
 * Grammar Rules:
 * - Variables: [a-zA-Z][a-zA-Z0-9']* - Identifiers starting with letter
 * - Lambda: λ or \ - Lambda abstraction marker
 * - Dot: . - Separates parameter from body
 * - Parentheses: () - Surrounds function applications
 *
 * AST Node Types:
 * - Expression: Root wrapper containing a term
 * - Lambda: Function abstraction with parameter and body
 * - Application: Function application with function and argument
 * - Variable: Variable reference with name
 *
 * Example usage:
 * ```typescript
 * const ast = parser.parse('(λx.λy.x y)');
 * // Results in nested Lambda nodes representing curried function
 * ```
 */
const parser = syntax(`
  LAMBDA ::= /λ|\\\\/
  DOT ::= "."
  OPEN_PAREN ::= "("
  CLOSE_PAREN ::= ")"
  WHITESPACE ::= /\\s+/
  VARIABLE ::= /[a-zA-Z][a-zA-Z0-9']*/

  <Expression> ::= {
    : <optional_whitespace>,
    expression: <term>,
    : <optional_whitespace>
  }
  <Lambda> ::= {
    : LAMBDA,
    parameter: <- VARIABLE,
    : DOT,
    body: <term>
  }
  <Application> ::= {
    : OPEN_PAREN <optional_whitespace>,
    function: <term>,
    : <optional_whitespace>,
    argument: <term>,
    : <optional_whitespace> CLOSE_PAREN
  }
  <Variable> ::= {
    name: <- VARIABLE
  }
  <term> ::= <Variable> | <Lambda> | <Application>
  <optional_whitespace> ::= WHITESPACE | ""
`);

// Export the node/token types that were inferred from the parser source
// (these are generated from this file's source code via codegen)
export type LambdaCalculusNode = InferSyntaxNodeType<typeof parser>;
export type LambdaCalculusToken = InferSyntaxTokenType<typeof parser>;
export type LambdaCalculusRootNode = InferSyntaxRootNode<typeof parser>;
export type LambdaCalculusNodes = InferSyntaxNodeTypeLookup<typeof parser>;
export type LambdaCalculusTokens = InferSyntaxTokenTypeLookup<typeof parser>;

// Export the parser for use in other files
export default parser;
