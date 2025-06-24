# `syntax`

A TypeScript parser combinator library for building type-safe parsers with declarative grammar definitions.

## Overview

This project acts as a toolkit for quickly defining type-safe grammars, which can be used to parse input text directly into valid ASTs.

Unlike most parser toolchains, this library generates TypeScript types for all AST nodes in the grammar, and automatically constructs a typed AST directly from the input source text.

This is achieved by a combination of the following:

1. **Parser Combinators** (the foundation): A low-level library of composable parsing primitives
2. **BNF-style Syntax** (syntactic sugar): A high-level declarative grammar definition DSL for rapidly defining grammars and AST node construction rules

   > Fun fact: The DSL syntax is itself parsed using a grammar constructed from the underlying parser combinators. Meta!
3. **Codegen** (type definitions): TypeScript types are automatically generated based on semantic analysis of grammar source files


## Quick Start

### Installation

```bash
npm install @timkendrick/syntax
```

### Basic Usage

1. Define a grammar using the `syntax` function:

   ```typescript
   import { syntax } from '@timkendrick/syntax';
   
   const parser = syntax(`
     NUMBER ::= /\\d+/
     PLUS ::= "+"
     
     <Expression> ::= {
       left: <- NUMBER,
       : PLUS,
       right: <- NUMBER
     }
   `);
   ```

2. Use the parser to parse input text into an AST:

   ```typescript
   const rootNode = parser.parse("42+17");
   // rootNode.type === "Expression"
   // rootNode.properties.left === "42"
   // rootNode.properties.right === "17"
   
   // Manually create an AST node:
   const node = parser.nodes.Expression("3", "4");
   ```

3. Generate TypeScript type definitions for grammar files using the `syntax-codegen` tool (optional):

   ```bash
   npx @timkendrick/syntax-codegen ./path/to/file.grammar.js
   ```
   
   Ensure the generated TypeScript types are visible within your grammar file:
   
   ```typescript
   import './file.grammar.generated.d.ts';
   ```

## Features

- **Declarative Grammar Syntax**: Define grammars using an intuitive, BNF-like syntax
- **Full Type Safety**: Automatically inferred TypeScript types for tokens and AST nodes
- **Parser Combinators**: Composable parsing primitives for building complex grammars
- **Code Generation**: Automatic generation of type definitions from grammar files
- **Typed Node Factories**: Automatic generation of AST node factories from grammar files
- **Human-friendly Errors**: Parse errors include source snippets with error locations

## Grammar Syntax

For full documentation on the grammar definition DSL, see the [`syntax` package README](packages/syntax/README.md#grammar-syntax).

## Examples

See the [`packages/syntax-examples/`](./packages/syntax-examples/) directory for complete working examples:

- [Lambda Calculus Grammar](./packages/syntax-examples/src/languages/lambda-calculus.grammar.ts)
- [Lisp Grammar](./packages/syntax-examples/src/languages/lisp.grammar.ts)

## Development

### Scripts

- `pnpm install` - Install dev dependencies
- `pnpm verify` - Run linting and tests
- `pnpm test` - Run tests
- `pnpm test:watch` - Run tests in watch mode

## Architecture

For detailed information about the library's design and implementation, see [packages/syntax/ARCHITECTURE.md](packages/syntax/ARCHITECTURE.md).

## License

MIT
