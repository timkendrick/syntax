# @timkendrick/syntax-examples

Example language parsers demonstrating the capabilities of the `@timkendrick/syntax` parser combinator library.

## Overview

This package contains complete, working parsers for two different languages:

1. **[Lambda Calculus](src/languages/lambda-calculus.grammar.ts)** - A functional programming language with variables, abstractions, and applications
2. **[Lisp](src/languages/lisp.grammar.ts)** - An s-expression language with lists, symbols, and string literals

These examples demonstrate real-world usage of the parser combinator library and serve as templates for building your own language parsers.

See the individual grammar files for detailed documentation of syntax, grammar rules, and AST node types.

## Code Generation

The examples include auto-generated TypeScript definitions. These are automatically created by running:

```bash
pnpm run codegen
```

The generated files provide complete type definitions for all AST nodes and tokens described in the language grammar.

## Testing

Each grammar includes comprehensive tests. Run the tests with:

```bash
pnpm test
```
