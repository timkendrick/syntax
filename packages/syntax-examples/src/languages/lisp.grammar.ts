import {
  syntax,
  type InferSyntaxNodeType,
  type InferSyntaxNodeTypeLookup,
  type InferSyntaxRootNode,
  type InferSyntaxTokenType,
  type InferSyntaxTokenTypeLookup,
} from '@timkendrick/syntax';

// Ensure type declarations are exposed for full type inference
import './lisp.grammar.generated.d';

/**
 * Lisp Parser
 *
 * This parser implements a grammar for Lisp-style S-expressions, supporting symbols,
 * lists, and string literals in a traditional Lisp syntax.
 *
 * Supported syntax:
 * - "hello, \"world\""         // String literals
 * - symbol-name                // Symbols
 * - (+ 1 2 3)                  // Lists with items
 *
 * Grammar Rules:
 * - Symbols: [^()" \t\n]+ - Non-whitespace, non-delimiter characters
 * - Strings: "..." - Double-quoted string literals with escape sequences
 * - Lists: (...) - Parenthesized expressions
 * - Whitespace: Spaces, tabs, and newlines for separation
 *
 * AST Node Types:
 * - Program: Root node containing list of newline-separated statements
 * - List: Parenthesized list of expressions
 * - Symbol: Symbolic identifier with string value
 * - StringLiteral: String literal with source text
 *
 * Example usage:
 * ```typescript
 * const ast = parser.parse('(+ 1 2 3)');
 * // Results in List node with symbols "+", "1", "2", "3"
 * ```
 */
const parser = syntax(`
  OPEN_PAREN ::= "("
  CLOSE_PAREN ::= ")"
  WHITESPACE ::= /[ \\t]+/
  NEWLINE ::= /\\n+/
  STRING ::= /"(?:[^"\\\\\\n]|\\\\.)*"/
  NAME ::= /[^()" \\t\\n]+/

  <Program> ::= {
    : <optional_whitespace>,
    statements: <statement_list>,
    : <optional_whitespace>
  }
  <List> ::= {
    : OPEN_PAREN <optional_whitespace> | OPEN_PAREN,
    items: <expression_list>,
    : <optional_whitespace> CLOSE_PAREN | CLOSE_PAREN
  }
  <Symbol> ::= {
    value: <- NAME
  }
  <StringLiteral> ::= {
    source: <- STRING
  }
  <expression> ::= <Symbol> | <List> | <StringLiteral>
  <expression_list> ::= [<expression>, <whitespace>]
  <statement_list> ::= [<expression>, <statement_separator>]
  <statement_separator> ::= <optional_padding> NEWLINE <optional_whitespace>
  <optional_padding> ::= WHITESPACE | ""
  <whitespace> ::= WHITESPACE <optional_whitespace> | NEWLINE <optional_whitespace>
  <optional_whitespace> ::= <whitespace> | ""
`);

// Export the node/token types that were inferred from the parser source
// (these are generated from this file's source code via codegen)
export type LispNode = InferSyntaxNodeType<typeof parser>;
export type LispToken = InferSyntaxTokenType<typeof parser>;
export type LispRootNode = InferSyntaxRootNode<typeof parser>;
export type LispNodes = InferSyntaxNodeTypeLookup<typeof parser>;
export type LispTokens = InferSyntaxTokenTypeLookup<typeof parser>;

// Export the parser for use in other files
export default parser;
