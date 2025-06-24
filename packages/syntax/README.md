# @timkendrick/syntax

A TypeScript parser combinator library for building type-safe parsers with declarative grammar definitions.

## Installation

```bash
npm install @timkendrick/syntax
```

## Quick Start

```typescript
import { syntax } from '@timkendrick/syntax';

// Define a simple arithmetic grammar
const parser = syntax(`
  NUMBER ::= /\\d+/
  PLUS ::= "+"
  MULTIPLY ::= "*"
  OPEN_PAREN ::= "("
  CLOSE_PAREN ::= ")"
  
  <Formula> ::= {
    expression: <expression>
  }
  <expression> ::= <Addition> | <term>
  <Addition> ::= {
    left: <term>,
    : PLUS,
    right: <expression>
  }
  <term> ::= <Multiplication> | <Number>
  <Multiplication> ::= {
    left: <Number>,
    : MULTIPLY,
    right: <term>
  }
  <Number> ::= {
    value: <- NUMBER
  }
`);

// Parse input
const result = parser.parse("2+3*4");
console.log(result);
```

## Grammar Syntax

The high-level DSL for defining grammars uses BNF grammar syntax as a starting point, and extends this with syntax for automatic construction of AST nodes and lists.

### Token Definitions

Define tokens using the `::=` operator:

```
TOKEN_NAME ::= "string_literal"    // Exact string match
TOKEN_NAME ::= /regex_pattern/     // Regular expression
```

Examples:
```
SEMICOLON ::= ";"
QUOTE ::= "\""
IDENTIFIER ::= /[a-zA-Z_][a-zA-Z0-9_]*/
NUMBER ::= /\d+(\.\d+)?/
WHITESPACE ::= /\s+/
```

### Helper aliases

Non-terminal helper abstractions can be defined using angle brackets:

```
<foo> ::= FOO
```

> Note: Alias names must start with a lowercase letter to avoid collisions with AST node names

### Sequences

Within non-terminal rules, patterns can be chained by separating them with spaces:

```
<parenthesized_expression> ::= OPEN_PAREN <expression> CLOSE_PAREN
```

### Choice Syntax

Use `|` for alternatives:

```
<expression> ::= <number> | <string> | <identifier>
```

### Empty Productions

Use `""` for empty productions (useful for defining optional rules):

```
<optional_type> ::= <type> | ""
```

### List Syntax

Use `[item, separator]` for delimited lists:

```
<argument_list> ::= [<expression>, COMMA]
<statement_list> ::= [<statement>, SEMICOLON]
```

The matched patterns will be parsed as arrays, omitting the separators from the parsed value.

### AST Node Definitions

Define AST nodes using angle brackets and struct syntax:

```
<NodeName> ::= {
  property_name: <- TOKEN_NAME,     // String property
  other_property: <OtherNode>,      // Nested node
  : IGNORED_TOKEN                   // Consumed but not stored
}
```

> Note: AST node names must start with a capital letter

#### Node Property Syntax

- `property: TOKEN` - Store token in property
- `property: <- TOKEN` - Store token's text content in property
- `: TOKEN` - Match token and store raw token object in property
- `property: <Node>` - Store nested node in property

All grammars must define at least one AST node type. The first AST node declaration will be used as the root node of the overall AST.

## API Reference

### Top-level Functions

#### `syntax(grammarDefinition: string)`

Creates a parser from a BNF-style grammar definition string.

**Returns:** `SyntaxParser` object with:
- `parse(input: string)` - Parse input string into an AST
- `tokens` - Token factory functions
- `nodes` - Node factory functions
- `grammar` - Underlying grammar object

##### Automatic Type Generation

Use the `syntax-codegen` CLI tool to generate TypeScript declarations for your grammar files:

```bash
npx @timkendrick/syntax-codegen ./src/**/*.grammar.ts
```

This will locate all `syntax` definitions within the provided source files, and generates `*.generated.d.ts` files containing complete type definitions for the custom grammar.

##### Type Inference Helpers

```typescript
import type {
  InferSyntaxNodeType,
  InferSyntaxTokenType,
  InferSyntaxRootNode,
  InferSyntaxNodeTypeLookup,
  InferSyntaxTokenTypeLookup
} from '@timkendrick/syntax';

// Generate a parser via the high-level DSL
const parser = syntax("[...language grammar]")

// Extract AST types from parser (relies on codegen)
type MyNode = InferSyntaxNodeType<typeof parser>;      // Union of all node types
type MyToken = InferSyntaxTokenType<typeof parser>;    // Union of all token types
type MyRootNode = InferSyntaxRootNode<typeof parser>;  // AST root node type

// Look up individual node types by name
type AstNodes = InferSyntaxNodeTypeLookup<typeof parser>;
type ExpressionNode = AstNodes["Expression"];
```

#### `createGrammar(definition)`

For advanced use cases, create grammars programmatically using parser combinators directly instead of the BNF-style DSL. This provides full control over parser construction.

```typescript
import { createGrammar } from '@timkendrick/syntax';

const grammar = createGrammar({
  tokens: {
    NUMBER: /\d+/,
    PLUS: '+',
    MULTIPLY: '*'
  },
  rules: (tokens) => ({
    Expression: (rules) => choice(
      rules.Addition,
      rules.Number
    ),
    Addition: (rules) => struct(
      field('left', rules.Number),
      field(null, token(tokens.PLUS)),
      field('right', rules.Expression)
    ),
    Number: (rules) => struct(
      field('value', text(token(tokens.NUMBER)))
    ),
  })
});
```

### Parser Combinators

The library provides low-level combinators for building grammars programmatically:

#### Primitive Combinators

- `token<T>(type: T): ParserRule<Token<T>>` - Match specific token type
- `empty(): ParserRule<null>` - Always succeeds, consumes nothing

#### Sequencing

- `sequence<T>([...rules]): ParserRule<T>` - All rules must succeed in order
- `choice<T>(...rules): ParserRule<T>` - First successful rule wins

#### Repetition

- `optional<T>(rule): ParserRule<T | null>` - Zero or one matches (never fails)
- `zeroOrMore<T>(rule): ParserRule<T[]>` - Zero or more matches
- `oneOrMore<T>(rule): ParserRule<T[]>` - One or more matches

#### Lists

- `list<T, S>(itemRule, separatorRule): ParserRule<T[]>` - Separated list parsing

#### Transformation

- `map<T, U>(rule, fn): ParserRule<U>` - Transform parse result
- `text(rule): ParserRule<string>` - Extract source text from tokens
- `struct(...fields): ParserRule<object>` - Build structured objects

#### Node Creation

- `node<T>(type, rule): ParserRule<AstNode<T>>` - Create AST node
- `field<T>(key, rule): FieldDescriptor<T>` - Named field for struct

### Custom Combinators

For complex patterns that cannot be expressed using the existing parser combinators, you can create a custom rule parser.

The rule factory will be passed an object containing all the rules in the grammar, allowing this rule to invoke others (or itself, recursively).

The rule factory returns a `ParserRule` function, which accepts the parser `state` and a set of `helpers` for reading input tokens.

```typescript
const expressionPair = (rules) => (state, helpers) => {
  const { readToken, eof } = helpers;
  // Keep track of the parser state and any consumed tokens
  let currentState = state;
  const tokens = [];
  // Parse the left expression
  const leftResult = rules.expression(currentState, helpers);
  if (leftResult.type === ResultType.Error) return leftResult;
  const { value: leftValue, tokens: leftTokens, ...leftState } = leftResult.value;
  currentState = { ...leftState, tokens: [...currentState.tokens, ...leftTokens] };
  // Parse the separator token
  const separatorToken = readToken(currentState.index);
  if (separatorToken === null || separatorToken.type !== 'COMMA') {
    return {
      type: ResultType.Error,
      error: new ParseError('Expected comma separator', input, separatorToken?.location ?? eof)
    };
  }
  currentState.currentIndex++;
  tokens.push(separatorToken);
  // Parse the right expression
  const rightResult = rules.expression(currentState, helpers);
  if (rightResult.type === ResultType.Error) return rightResult;
  const { value: rightValue, tokens: rightTokens, ...rightState } = rightResult.value;
  currentState = { ...rightState, tokens: [...currentState.tokens, ...rightTokens] };
  // Return the collected value and latest parser state
  return {
    type: ResultType.Success,
    value: {
      ...currentState,
      value: { left: leftValue, right: rightValue },
      tokens
    }
  };
};
```

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for more details on how parser rules are implemented.

### Custom Token Parsers

For tokens that cannot be expressed as strings or regular expressions, you can create a custom parser:

```typescript
import { createTokenParser } from '@timkendrick/syntax';

const customToken = createTokenParser((state) => {
  // Custom parsing logic
  // Return new state or null
});
```

### Grammar Extension

```typescript
import { extendGrammar } from '@timkendrick/syntax';

const extendedGrammar = extendGrammar(baseGrammar, {
  NewNodeType: (rules) => struct(
    field('property', token('TOKEN'))
  )
});
```

## Error Handling

The parser provides detailed error information:

```typescript
try {
  const result = parser.parse(input);
  console.log(result);
} catch (error) {
  if (error instanceof ParserRuleError) {
    console.log(`Parse error at position ${error.location.start}: ${error.message}`);
  }
}
```

## Tips for writing grammars

- The parser uses recursive descent with backtracking
- Choice combinators try alternatives in order
- Consider left-recursion elimination for better performance (and avoiding infinite loops)
- Use specific token types early in choice alternatives

## Code Organization

### Key Files

- [`src/grammar.ts`](./src/grammar.ts): Core types and grammar creation
- [`src/parser.ts`](./src/parser.ts): Parsing engine and result handling
- [`src/combinators/`](./src/combinators/): Individual combinator implementations
- [`src/syntax.ts`](./src/syntax.ts): Public high-level API and DSL

## Architecture

For detailed information about the library's internal design and implementation, see [ARCHITECTURE.md](ARCHITECTURE.md).
