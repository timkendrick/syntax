import { describe, expect, it } from 'vitest';

import generate from '@babel/generator';
import type * as t from '@babel/types';
import { ResultType, parseSyntaxAst } from '@timkendrick/syntax';

import { generateSyntaxTypes } from './codegen.ts';

function clean(input: string): string;
function clean(input: TemplateStringsArray, ...values: Array<string>): string;
function clean(input: TemplateStringsArray | string, ...values: Array<string>): string {
  if (typeof input !== 'string') {
    let result = '';
    for (let i = 0; i < input.length; i++) {
      result += input[i];
      if (i < values.length) result += values[i];
    }
    return clean(result);
  }
  return input
    .trim()
    .replaceAll(/\n\n+/g, '\n') // Condense repeated newlines
    .replaceAll(/\n\s+/g, '\n'); // Remove leading whitespace from each line
}

// Helper function to convert AST statements to formatted string
function formatTypeDefinitions(statements: Array<t.Statement>): string {
  return statements
    .map((statement) => generate(statement, { retainLines: false, compact: false }).code)
    .join('\n');
}

describe(generateSyntaxTypes, () => {
  it('should format a simple struct', () => {
    const input = parseSyntaxAst(`
      TOKEN ::= "token"
      <Root> ::= {
        value: <- TOKEN
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN;
      type TestTokenType_TOKEN = "TOKEN";
      type TestNodeType = TestNodeType_Root;
      type TestNodeType_Root = "Root";
      type TestNode = TestRootNode;
      type TestRoot = TestRootNode;
      type TestRootNode = AstNode<TestNodeType_Root, TestRootNodeProperties>;
      interface TestRootNodeProperties {
        value: string;
      }
    `);
  });

  it('should handle multiple node types', () => {
    const input = parseSyntaxAst(`
      TOKEN_A ::= "a"
      TOKEN_B ::= "b"
      <Root> ::= {
        child: <Child>
      }
      <Child> ::= {
        token_a: TOKEN_A,
        token_b: TOKEN_B
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN_A | TestTokenType_TOKEN_B;
      type TestTokenType_TOKEN_A = "TOKEN_A";
      type TestTokenType_TOKEN_B = "TOKEN_B";
      type TestNodeType = TestNodeType_Root | TestNodeType_Child;
      type TestNodeType_Root = "Root";
      type TestNodeType_Child = "Child";
      type TestNode = TestRootNode | TestChildNode;
      type TestRoot = TestRootNode;
      type TestRootNode = AstNode<TestNodeType_Root, TestRootNodeProperties>;
      interface TestRootNodeProperties {
        child: TestChildNode;
      }
      type TestChildNode = AstNode<TestNodeType_Child, TestChildNodeProperties>;
      interface TestChildNodeProperties {
        token_a: Token<TestTokenType_TOKEN_A>;
        token_b: Token<TestTokenType_TOKEN_B>;
      }
    `);
  });

  it('should handle choice nodes', () => {
    const input = parseSyntaxAst(`
      TOKEN_A ::= "a"
      TOKEN_B ::= "b"
      <Root> ::= <A> | <B>
      <A> ::= {
        value: TOKEN_A
      }
      <B> ::= {
        value: TOKEN_B
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN_A | TestTokenType_TOKEN_B;
      type TestTokenType_TOKEN_A = "TOKEN_A";
      type TestTokenType_TOKEN_B = "TOKEN_B";
      type TestNodeType = TestNodeType_Root | TestNodeType_A | TestNodeType_B;
      type TestNodeType_Root = "Root";
      type TestNodeType_A = "A";
      type TestNodeType_B = "B";
      type TestNode = TestRootNode | TestANode | TestBNode;
      type TestRoot = TestRootNode;
      type TestRootNode = TestANode | TestBNode;
      type TestANode = AstNode<TestNodeType_A, TestANodeProperties>;
      interface TestANodeProperties {
        value: Token<TestTokenType_TOKEN_A>;
      }
      type TestBNode = AstNode<TestNodeType_B, TestBNodeProperties>;
      interface TestBNodeProperties {
        value: Token<TestTokenType_TOKEN_B>;
      }
    `);
  });

  it('should handle private rules', () => {
    const input = parseSyntaxAst(`
      TOKEN ::= "token"
      <Root> ::= <private_rule>
      <private_rule> ::= {
        value: <- TOKEN
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN;
      type TestTokenType_TOKEN = "TOKEN";
      type TestNodeType = TestNodeType_Root;
      type TestNodeType_Root = "Root";
      type TestNode = TestRootNode;
      type TestRoot = TestRootNode;
      type TestRootNode = TestPattern_private_rule;
      type TestPattern_private_rule = {
        value: string;
      };
    `);
  });

  it('should handle list nodes', () => {
    const input = parseSyntaxAst(`
      ITEM_TOKEN ::= "item"
      SEPARATOR_TOKEN ::= ","
      <Root> ::= {
        items: <list_of_items>
      }
      <list_of_items> ::= [<Item>, SEPARATOR_TOKEN]
      <Item> ::= {
        value: ITEM_TOKEN
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_ITEM_TOKEN | TestTokenType_SEPARATOR_TOKEN;
      type TestTokenType_ITEM_TOKEN = "ITEM_TOKEN";
      type TestTokenType_SEPARATOR_TOKEN = "SEPARATOR_TOKEN";
      type TestNodeType = TestNodeType_Root | TestNodeType_Item;
      type TestNodeType_Root = "Root";
      type TestNodeType_Item = "Item";
      type TestNode = TestRootNode | TestItemNode;
      type TestRoot = TestRootNode;
      type TestRootNode = AstNode<TestNodeType_Root, TestRootNodeProperties>;
      interface TestRootNodeProperties {
        items: TestPattern_list_of_items;
      }
      type TestItemNode = AstNode<TestNodeType_Item, TestItemNodeProperties>;
      interface TestItemNodeProperties {
        value: Token<TestTokenType_ITEM_TOKEN>;
      }
      type TestPattern_list_of_items = Array<TestItemNode>;
    `);
  });

  it('should handle anonymous fields in structs', () => {
    const input = parseSyntaxAst(`
      TOKEN_A ::= "a"
      TOKEN_B ::= "b"
      <Root> ::= {
        : TOKEN_A,
        value: TOKEN_B
      }
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN_A | TestTokenType_TOKEN_B;
      type TestTokenType_TOKEN_A = "TOKEN_A";
      type TestTokenType_TOKEN_B = "TOKEN_B";
      type TestNodeType = TestNodeType_Root;
      type TestNodeType_Root = "Root";
      type TestNode = TestRootNode;
      type TestRoot = TestRootNode;
      type TestRootNode = AstNode<TestNodeType_Root, TestRootNodeProperties>;
      interface TestRootNodeProperties {
        value: Token<TestTokenType_TOKEN_B>;
      }
    `);
  });

  it('should handle sequences', () => {
    const input = parseSyntaxAst(`
      TOKEN_A ::= "a"
      TOKEN_B ::= "b"
      <Root> ::= TOKEN_A TOKEN_B
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestTokenType = TestTokenType_TOKEN_A | TestTokenType_TOKEN_B;
      type TestTokenType_TOKEN_A = "TOKEN_A";
      type TestTokenType_TOKEN_B = "TOKEN_B";
      type TestNodeType = TestNodeType_Root;
      type TestNodeType_Root = "Root";
      type TestNode = TestRootNode;
      type TestRoot = TestRootNode;
      type TestRootNode = [Token<TestTokenType_TOKEN_A>, Token<TestTokenType_TOKEN_B>];
    `);
  });

  it('should handle empty nodes', () => {
    const input = parseSyntaxAst(`
      <Root> ::= ""
    `);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Test');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type TestNodeType = TestNodeType_Root;
      type TestNodeType_Root = "Root";
      type TestNode = TestRootNode;
      type TestRoot = TestRootNode;
      type TestRootNode = null;
    `);
  });

  it('should generate types for a simple lisp grammar', () => {
    const grammar = `
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
    `;
    const input = parseSyntaxAst(grammar);
    if (input.type === ResultType.Error) throw input.error;
    const result = generateSyntaxTypes(input.value, 'Lisp');
    expect(clean(formatTypeDefinitions(result.typeDefinitions))).toBe(clean`
      type LispTokenType = LispTokenType_OPEN_PAREN | LispTokenType_CLOSE_PAREN | LispTokenType_WHITESPACE | LispTokenType_NEWLINE | LispTokenType_STRING | LispTokenType_NAME;
      type LispTokenType_OPEN_PAREN = "OPEN_PAREN";
      type LispTokenType_CLOSE_PAREN = "CLOSE_PAREN";
      type LispTokenType_WHITESPACE = "WHITESPACE";
      type LispTokenType_NEWLINE = "NEWLINE";
      type LispTokenType_STRING = "STRING";
      type LispTokenType_NAME = "NAME";
      type LispNodeType = LispNodeType_Program | LispNodeType_List | LispNodeType_Symbol | LispNodeType_StringLiteral;
      type LispNodeType_Program = "Program";
      type LispNodeType_List = "List";
      type LispNodeType_Symbol = "Symbol";
      type LispNodeType_StringLiteral = "StringLiteral";
      type LispNode = LispProgramNode | LispListNode | LispSymbolNode | LispStringLiteralNode;
      type LispRoot = LispProgramNode;
      type LispProgramNode = AstNode<LispNodeType_Program, LispProgramNodeProperties>;
      interface LispProgramNodeProperties {
        statements: LispPattern_statement_list;
      }
      type LispListNode = AstNode<LispNodeType_List, LispListNodeProperties>;
      interface LispListNodeProperties {
        items: LispPattern_expression_list;
      }
      type LispSymbolNode = AstNode<LispNodeType_Symbol, LispSymbolNodeProperties>;
      interface LispSymbolNodeProperties {
        value: string;
      }
      type LispStringLiteralNode = AstNode<LispNodeType_StringLiteral, LispStringLiteralNodeProperties>;
      interface LispStringLiteralNodeProperties {
        source: string;
      }
      type LispPattern_expression = LispSymbolNode | LispListNode | LispStringLiteralNode;
      type LispPattern_expression_list = Array<LispPattern_expression>;
      type LispPattern_statement_list = Array<LispPattern_expression>;
      type LispPattern_statement_separator = [LispPattern_optional_padding, Token<LispTokenType_NEWLINE>, LispPattern_optional_whitespace];
      type LispPattern_optional_padding = Token<LispTokenType_WHITESPACE> | null;
      type LispPattern_whitespace = [Token<LispTokenType_WHITESPACE>, LispPattern_optional_whitespace] | [Token<LispTokenType_NEWLINE>, LispPattern_optional_whitespace];
      type LispPattern_optional_whitespace = LispPattern_whitespace | null;
    `);
  });
});
