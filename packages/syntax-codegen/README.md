# @timkendrick/syntax-codegen

Type declaration generator for `@timkendrick/syntax`.

Use the `syntax-codegen` CLI tool to generate TypeScript declarations for your grammar files:

```bash
npx @timkendrick/syntax-codegen ./src/**/*.grammar.ts
```

This will locate all `syntax` definitions within the provided source files, and generates `*.generated.d.ts` files containing complete type definitions for the custom grammar.
