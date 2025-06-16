# Architecture

This document explains the core concepts, design decisions, and implementation details of the grammar parser library.

## High-Level Design

The library is built around a **declarative parser combinator framework** that allows rapid construction of type-safe grammars. This approach provides several key benefits:

- **Type Safety**: Full TypeScript type inference for tokens and AST nodes
- **Composability**: Small, reusable parsing primitives that combine into complex parsers
- **Readability**: Grammar definitions that closely resemble formal grammar notation
- **Maintainability**: Clear separation between grammar rules and parsing implementation

## Core Concepts

### Rules and Parser Combinators

The foundation of the system is the `ParserRule<T>` concept - a high-level description of a parsing operation:

```typescript
type ParserRule<T> = (state: ParserRuleInputState, helpers: ParserRuleHelpers) => ParserRuleResult<T>;
```

Rules are functions that:
1. Take the current parser state (token stream, position, source)
2. Return either a successful result with parsed value or an error
3. Can be composed using combinator functions to build complex parsers

### Parser State

The parsing state threads through all rule executions:

```typescript
interface ParserRuleInputState<TToken> {
  readonly input: ReadonlyArray<Token<TToken>>;  // Token stream
  readonly source: string;                       // Original source code
  readonly currentIndex: number;                 // Index of current token
}
```

### Parser Helpers

The `ParserRuleHelpers` interface provides utility functions that parser rules use to interact with the input stream and source code:

```typescript
interface ParserRuleHelpers<TToken extends TokenType> {
  readonly eof: Location;
  readToken(this: void, index: number): Token<TToken> | null;
  isTokenType<V extends TToken>(this: void, token: Token<TToken>, type: V): token is typeof token & { type: V };
  getTokenSource(this: void, token: Token<TToken>): string;
}
```

- `readToken(index: number): Token<TToken> | null` - Read token at specific position, returns null if beyond input
- `isTokenType<V>(token: Token<TToken>, type: V): token is Token<V>` - Type-safe token type checking with narrowing
- `getTokenSource(token: Token<TToken>): string` - Extract original source text for a token
- `eof: Location` - Location representing end of input (useful for error reporting)

### Parser Errors

The `ParserError` class can be used to report an error within a parser rule at a given input token location.

```typescript
// ...custom parser code code...
if (!getTokenSource(token).endsWith('"')) throw new ParseError('Unterminated string', input, token)
```

The error message will contain a human-friendly indication of where the error occured in the input text.

```
ParseError: Unterminated string at [2:21]
2 |  INVALID_TOKEN ::= "unterminated
                       ^^^^^^^^^^^^^
```

### Tokens and AST Nodes

- **Tokens**: Represent lexical elements with type and location information
- **AST Nodes**: Structured representation with type, properties, and token locations
- **Token Trees**: Hierarchical structure tracking which tokens were consumed by each rule

## Parser Combinators

The library provides a comprehensive set of combinators for building parsers:

### Primitive Combinators

- `token<T>(type: T)` - Consumes a single token of specific type
- `empty()` - Always succeeds without consuming input

### Flow Control

- `sequence([...rules])` - Apply rules in order, all must succeed
- `choice(...rules)` - Try rules in order, first success wins
- `optional(rule)` - ParserRule succeeds or returns null, never fails

### Repetition

- `zeroOrMore(rule)` - Apply rule repeatedly, collect results
- `oneOrMore(rule)` - Like zeroOrMore but requires at least one match
- `list(itemRule, separatorRule)` - Parse separated lists (e.g., `a, b, c`)

### Transformation

- `map(rule, transformFn)` - Transform successful parse results
- `text(rule)` - Extract source text from matched tokens
- `struct(...fields)` - Build objects from named fields

### Structural

- `field(key, rule)` - Associate rule result with property name
- `node(nodeType, rule)` - Create AST node with specific type

## Grammar Definition Language

The library includes a domain-specific language for defining grammars using a BNF-like syntax:

### Token Syntax
```
TOKEN_NAME ::= "literal"     // String literal
TOKEN_NAME ::= /pattern/     // Regular expression
```

### Node Syntax
```
<NodeName> ::= {
  property: TOKEN_NAME,      // Named property
  : IGNORED_TOKEN,           // Ignored (no property)
  nested: <OtherNode>        // Nested node reference
}
```

### Special Operations
```
<Node> ::= <A> | <B>         // Choice
<Node> ::= [<Item>, SEP]     // List with separator
property: <- TOKEN           // Extract token text
```

## Type System Integration

One of the library's key strengths is its deep TypeScript integration:

### Automatic Type Inference

The `syntax()` function automatically infers types from grammar definitions:

```typescript
const parser = syntax(`...grammar...`);

// These types are automatically inferred:
type NodeType = InferSyntaxNodeType<typeof parser>;
type TokenType = InferSyntaxTokenType<typeof parser>;
type RootNode = InferSyntaxRootNode<typeof parser>;
```

### Code Generation

The `syntax-codegen` tool generates TypeScript declaration files with:
- Union types for all possible AST nodes
- Token type definitions
- Lookup types for type-safe node access

### Runtime Type Safety

The parser provides runtime type checking and maintains type safety throughout:
- Token matching verifies types at runtime
- AST construction preserves property types
- Parse results are fully typed

## Error Handling

The library implements sophisticated error handling:

### Error Propagation
- Rules return `Result<Success, Error>` types
- Errors include location information for debugging
- Choice combinators select the error from the rule that advanced furthest

### Error Recovery
- Optional rules never fail (return null on failure)
- List parsing handles empty lists gracefully
- Clear error messages indicate expected tokens

## Performance Characteristics

### Parsing Strategy
- **Recursive Descent**: Top-down parsing approach
- **Backtracking**: Choice combinators can backtrack on failure

### Memory Management
- Token streams are readonly arrays
- State objects are immutable for ease of debugging
- Token trees efficiently track consumed tokens

## Extensibility

The architecture supports several extension points:

### Custom Combinators
New combinators can be built by composing existing ones or implementing the `ParserRule<T>` interface directly.

### Grammar Extension
The `extendGrammar()` function allows adding new node types to existing grammars.

### Custom Token Parsers
Token parsing can be customized by providing custom `TokenParser` functions.
