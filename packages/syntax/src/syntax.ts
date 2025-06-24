import {
  choice,
  empty,
  field,
  list,
  map,
  node,
  oneOrMore,
  optional,
  sequence,
  struct,
  text,
  token,
  zeroOrMore,
} from './combinators/index.ts';
import {
  createGrammar,
  createTokenParser,
  type AnyAstNode,
  type AstNode,
  type AstNodeParserRule,
  type AstParserRules,
  type Grammar,
  type Location,
  type ParserRule,
  type ParserRuleFactory,
  type Token,
  type TokenParser,
  type TokenType,
} from './grammar.ts';
import { parse } from './parser.ts';
import { ResultType, type Result } from './result.ts';
import { isNonNull, unreachable } from './type.ts';

/**
 * Factory function for creating tokens with location information.
 * @template TToken The token type
 * @param location The location where the token was found in the source
 * @returns A token object with type and location
 */
export type TokenFactory<TToken extends TokenType> = (location: Location) => Token<TToken>;

/**
 * Factory function for creating AST nodes with properties and token locations.
 * @template TNode The AST node type
 * @param properties The properties object for the node
 * @param tokens Optional array of token locations consumed by this node
 * @returns An AST node with type, properties, and tokens
 */
export type NodeFactory<TNode extends AnyAstNode> = (
  properties: TNode['properties'],
  tokens?: Array<Location> | null,
) => TNode;

/**
 * A parser created from a grammar definition string.
 * Provides parsing functionality and factory functions for tokens and nodes.
 * @template TToken Union type of all token types in the grammar
 * @template TNode Union type of all AST node types in the grammar
 * @template TRoot The root AST node type returned by parsing
 */
export interface SyntaxParser<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TRoot extends TNode,
> {
  /** The underlying grammar object */
  grammar: Grammar<TToken, TNode>;
  /** The type of the root node returned by parsing */
  rootNodeType: TRoot['type'];
  /** Parse an input string into the root AST node */
  parse(this: void, input: string): TRoot;
  /** Factory functions for creating tokens */
  tokens: {
    [K in TToken]: TokenFactory<K>;
  };
  /** Factory functions for creating AST nodes */
  nodes: {
    [K in TNode['type']]: NodeFactory<Extract<TNode, { type: K }>>;
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** Extract the token type union from a SyntaxParser type */
export type InferSyntaxTokenType<T extends SyntaxParser<any, any, any>> =
  T extends SyntaxParser<infer TToken extends TokenType, any, any> ? TToken : never;

/** Extract the AST node type union from a SyntaxParser type */
export type InferSyntaxNodeType<T extends SyntaxParser<any, any, any>> =
  T extends SyntaxParser<any, infer TNode extends AnyAstNode, any> ? TNode : never;

/** Extract the root AST node type from a SyntaxParser type */
export type InferSyntaxRootNode<T extends SyntaxParser<any, any, any>> =
  T extends SyntaxParser<any, any, infer TRoot extends AnyAstNode> ? TRoot : never;

/** Create a lookup object mapping token type names to themselves */
export type InferSyntaxTokenTypeLookup<T extends SyntaxParser<any, any, any>> = {
  [K in InferSyntaxTokenType<T>]: K;
};

/** Create a lookup object mapping node type names to their node types */
export type InferSyntaxNodeTypeLookup<T extends SyntaxParser<any, any, any>> = {
  [K in InferSyntaxNodeType<T>['type']]: Extract<InferSyntaxNodeType<T>, { type: K }>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Create a parser from a grammar definition string.
 *
 * Takes a BNF-like grammar syntax and generates a type-safe parser that can
 * parse input strings into fully-typed AST nodes.
 *
 * @example
 * ```typescript
 * const parser = syntax(`
 *   NUMBER ::= /\d+/
 *   PLUS ::= "+"
 *
 *   <Expression> ::= {
 *     left: NUMBER,
 *     : PLUS,
 *     right: NUMBER
 *   }
 * `);
 *
 * const result = parser.parse("42 + 17");
 * // result.type === "Expression"
 * // result.properties.left === "42"
 * ```
 *
 * @template TToken The union type of all token types in the grammar
 * @template TNode The union type of all AST node types in the grammar
 * @template TRoot The root AST node type returned by parsing
 * @param source The grammar definition string in BNF-like syntax
 * @returns A SyntaxParser object with parse method and type factories
 * @throws SyntaxError if the grammar definition is invalid
 */
export function syntax<
  TToken extends string,
  TNode extends AstNode<string, object>,
  TRoot extends TNode,
>(source: string): SyntaxParser<TToken, TNode, TRoot> {
  // First parse the grammar definition source into an AST that represents the grammar rules
  const result = parseSyntaxAst(source);
  if (result.type === ResultType.Error) throw result.error;
  const { value: ast } = result;
  const { rules } = ast.properties;
  // Parse the AST grammar
  const { grammar, rootNodeType } = parseSyntaxGrammar<TToken, TNode, TRoot>(ast);
  // Create token factory functions based on the token types defined in the grammar
  const tokenFactories = Object.fromEntries(
    Object.keys(grammar.tokenTypes).map((tokenType) => [
      tokenType,
      (location: Location): Token<TToken> => ({
        type: tokenType as TToken,
        location,
      }),
    ]),
  ) as { [K in TToken]: TokenFactory<K> };
  // Create node factory functions based on the node types defined in the grammar
  const nodeTypesNames = rules
    .filter((rule) => rule.type === SyntaxNodeType.NonTerminalRule)
    .map((rule) => rule.properties.target)
    .filter(isNodeTypeIdentifier)
    .map((target) => target.properties.name);
  const nodeFactories = Object.fromEntries(
    nodeTypesNames.map((nodeType) => [
      nodeType,
      (properties: TNode['properties'], tokens: Array<Location> | null = null): TNode =>
        ({
          type: nodeType as TNode['type'],
          properties,
          tokens,
        }) as TNode,
    ]),
  ) as { [K in TNode['type']]: NodeFactory<Extract<TNode, { type: K }>> };
  // Return a parser that can parse input strings into the root node type according to these rules
  return {
    grammar,
    rootNodeType,
    parse: (input: string): TRoot => {
      const result = parse(input, grammar, rootNodeType);
      if (result.type === ResultType.Error) throw result.error;
      return result.value;
    },
    tokens: tokenFactories,
    nodes: nodeFactories,
  };
}

/**
 * Parse a syntax grammar definition string into an AST.
 * @param source The grammar definition string in BNF-like syntax
 * @returns The AST of the grammar definition
 */
export function parseSyntaxAst(source: string): Result<SyntaxProgramNode, SyntaxError> {
  return parse<SyntaxTokenType, SyntaxNode, SyntaxProgramNode>(
    source,
    SyntaxGrammar,
    SyntaxNodeType.Program,
  );
}

/**
 * Create a grammar object from the provided syntax grammar AST
 */
function parseSyntaxGrammar<
  TToken extends string,
  TNode extends AstNode<string, object>,
  TRoot extends TNode,
>(
  ast: SyntaxProgramNode,
): {
  grammar: Grammar<TToken, TNode>;
  rootNodeType: TRoot['type'];
} {
  const { rules } = ast.properties;
  // Find the root rule, which is the first non-terminal rule in the list
  const rootRule = rules.find((rule) => rule.type === SyntaxNodeType.NonTerminalRule);
  if (!rootRule) throw new SyntaxError('Missing root rule in syntax grammar');
  // Ensure the root rule refers to a valid AST node type
  const { target: rootIdentifier } = rootRule.properties;
  if (!isNodeTypeIdentifier(rootIdentifier)) {
    const { name: rootRuleName } = rootIdentifier.properties;
    throw new SyntaxError(`Root rule must define an AST Node: ${rootRuleName}`);
  }
  // Get the name of the AST node type defined by the root rule
  const { name: rootNodeName } = rootIdentifier.properties;
  const rootNodeType = rootNodeName as TRoot['type'];
  // Parse the token definitions from the syntax grammar
  const tokenDefinitions = rules
    .map((rule): [TToken, TokenParser | null] | null => {
      if (rule.type !== SyntaxNodeType.TerminalRule) return null;
      const { target, value } = rule.properties;
      const { name } = target.properties;
      const tokenType = name as TToken;
      const parser = parseTerminalToken(value);
      return [tokenType, parser];
    })
    .filter(isNonNull);
  const tokenTypes = Object.fromEntries(
    tokenDefinitions
      .map(([tokenType, value]) => (value === null ? null : [tokenType, value]))
      .filter(isNonNull),
  );
  interface TAliasRules
    extends Record<PropertyKey, ParserRuleFactory<TToken, TNode, TAliasRules, unknown>> {}
  const ruleFactories = Object.fromEntries(
    rules
      .map(
        (
          rule,
        ):
          | [TNode['type'], AstNodeParserRule<TToken, TNode, TAliasRules, TNode['type']>]
          | [keyof TAliasRules, TAliasRules[keyof TAliasRules]]
          | null => {
          if (rule.type === SyntaxNodeType.TerminalRule) return null;
          const { target: ruleIdentifier, value } = rule.properties;
          const { name: ruleName } = ruleIdentifier.properties;
          // If the rule defines an AST node type, wrap it in a typed node wrapper
          if (isNodeTypeIdentifier(ruleIdentifier)) {
            const nodeType = ruleName as TNode['type'];
            // Use the provided rule definition to create a parser for the node properties
            const propertiesParser = parseSyntaxExpression(value) as ParserRuleFactory<
              TToken,
              TNode,
              TAliasRules,
              TNode['properties']
            >;
            return [
              nodeType,
              ($): ParserRule<TToken, TNode> => {
                // Use the provided rule definition to parse the node properties
                const properties: ParserRule<TToken, TNode['properties']> = propertiesParser($);
                // Wrap the parsed properties in a typed node wrapper
                return node<TToken, TNode['type'], TNode['properties']>(
                  nodeType,
                  properties,
                ) as ParserRule<TToken, TNode>;
              },
            ];
          }
          // Otherwise parse the rule as an alias rule
          const parser: ParserRuleFactory<TToken, TNode, TAliasRules, unknown> =
            parseSyntaxExpression(value);
          return [ruleName as keyof TAliasRules, parser];
        },
      )
      .filter(isNonNull),
  ) as AstParserRules<TNode, TToken, TAliasRules>;
  // Create a grammar from the parsed rules and token definitions
  const parsedGrammar: Grammar<TToken, TNode> = createGrammar<TToken, TNode, TAliasRules>({
    tokens: tokenTypes,
    rules: (_) => ruleFactories,
  });
  return {
    grammar: parsedGrammar,
    rootNodeType,
  };
}

/**
 * Create a token parser for a terminal token defined in a syntax grammar AST
 */
function parseTerminalToken(value: SyntaxTokenNode): TokenParser | null {
  switch (value.type) {
    case SyntaxNodeType.Literal: {
      const { value: source } = value.properties;
      return createTokenParser(source);
    }
    case SyntaxNodeType.Pattern: {
      const { pattern } = value.properties;
      return createTokenParser(pattern);
    }
    default:
      return unreachable(value);
  }
}

/**
 * Create a parser rule for a syntax expression defined in a syntax grammar AST
 */
function parseSyntaxExpression<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
>(value: SyntaxExpressionNode): ParserRuleFactory<TToken, TNode, TAliasRules, unknown> {
  switch (value.type) {
    case SyntaxNodeType.Empty: {
      return ($): ParserRule<TToken, null> => empty();
    }
    case SyntaxNodeType.TerminalIdentifier: {
      const { name } = value.properties;
      const tokenType = name as TToken;
      return ($): ParserRule<TToken, Token<TToken>> => token(tokenType);
    }
    case SyntaxNodeType.NonTerminalIdentifier: {
      const { name } = value.properties;
      return ($): ParserRule<TToken, TNode | unknown> =>
        $[name as TNode['type'] | keyof TAliasRules];
    }
    case SyntaxNodeType.List: {
      const { item, separator } = value.properties;
      const itemParser = parseSyntaxExpression<TToken, TNode, TAliasRules>(item);
      const separatorParser = parseSyntaxExpression<TToken, TNode, TAliasRules>(separator);
      return ($): ParserRule<TToken, Array<unknown>> => list(itemParser($), separatorParser($));
    }
    case SyntaxNodeType.Struct: {
      const { fields } = value.properties;
      const fieldParsers = fields.map(
        (field): [string | null, ParserRuleFactory<TToken, TNode, TAliasRules, unknown>] => {
          const { name, value } = field.properties;
          const valueParser = parseSyntaxExpression<TToken, TNode, TAliasRules>(value);
          return [name, valueParser];
        },
      );
      return ($): ParserRule<TToken, Record<string, unknown>> =>
        struct<TToken, Record<string, unknown>>(
          ...fieldParsers.map(([name, valueParser]) =>
            field<TToken, string | null, unknown>(name, valueParser($)),
          ),
        );
    }
    case SyntaxNodeType.Choice: {
      const { alternatives } = value.properties;
      const alternativeParsers = alternatives.map((alternative) =>
        parseSyntaxExpression<TToken, TNode, TAliasRules>(alternative),
      );
      return ($): ParserRule<TToken, unknown> =>
        choice(...alternativeParsers.map((alternativeParser) => alternativeParser($)));
    }
    case SyntaxNodeType.Sequence: {
      const { elements } = value.properties;
      const itemParsers = elements.map((element) =>
        parseSyntaxExpression<TToken, TNode, TAliasRules>(element),
      );
      return ($): ParserRule<TToken, unknown> =>
        sequence(...itemParsers.map((itemParser) => itemParser($)));
    }
    case SyntaxNodeType.Read: {
      const { input } = value.properties;
      const inputParser = parseSyntaxExpression<TToken, TNode, TAliasRules>(input);
      return ($): ParserRule<TToken, string> => text(inputParser($));
    }
    default: {
      return unreachable(value);
    }
  }
}

/**
 * Determine whether a syntax grammar rule identifier refers to an AST node type
 *
 * AST node type names always start with an uppercase letter
 * (all other production rules start with a lowercase letter).
 * @param identifier The syntax grammar AST node to check
 * @returns True if the node is a non-terminal identifier, false otherwise
 */
export function isNodeTypeIdentifier(identifier: SyntaxNonTerminalIdentifierNode): boolean {
  const { name } = identifier.properties;
  // AST Node names are capitalized
  return name.charAt(0) === name.charAt(0).toUpperCase();
}

// Grammar for the syntax AST

export enum SyntaxTokenType {
  OpenBracket = 'OpenBracket',
  CloseBracket = 'CloseBracket',
  OpenSquareBracket = 'OpenSquareBracket',
  CloseSquareBracket = 'CloseSquareBracket',
  OpenBrace = 'OpenBrace',
  CloseBrace = 'CloseBrace',
  Equals = 'Equals',
  Pipe = 'Pipe',
  Comma = 'Comma',
  Colon = 'Colon',
  Assign = 'Assign',
  Identifier = 'Identifier',
  Empty = 'Empty',
  StringLiteral = 'StringLiteral',
  RegExp = 'RegExp',
  Whitespace = 'Whitespace',
  Newline = 'Newline',
}

export type SyntaxNode =
  | SyntaxProgramNode
  | SyntaxTerminalRuleNode
  | SyntaxNonTerminalRuleNode
  | SyntaxTerminalIdentifierNode
  | SyntaxNonTerminalIdentifierNode
  | SyntaxLiteralNode
  | SyntaxPatternNode
  | SyntaxEmptyNode
  | SyntaxListNode
  | SyntaxStructNode
  | SyntaxStructFieldNode
  | SyntaxReadNode
  | SyntaxChoiceNode
  | SyntaxSequenceNode;

export enum SyntaxNodeType {
  Program = 'Program',
  TerminalRule = 'TerminalRule',
  NonTerminalRule = 'NonTerminalRule',
  TerminalIdentifier = 'TerminalIdentifier',
  NonTerminalIdentifier = 'NonTerminalIdentifier',
  Literal = 'Literal',
  Pattern = 'Pattern',
  Empty = 'Empty',
  List = 'List',
  Struct = 'Struct',
  StructField = 'StructField',
  Read = 'Read',
  Choice = 'Choice',
  Sequence = 'Sequence',
}

export type SyntaxProgramNode = AstNode<SyntaxNodeType.Program, SyntaxProgramNodeProperties>;
export interface SyntaxProgramNodeProperties {
  rules: Array<SyntaxRuleNode>;
}

export type SyntaxTerminalRuleNode = AstNode<
  SyntaxNodeType.TerminalRule,
  SyntaxTerminalRuleNodeProperties
>;
export interface SyntaxTerminalRuleNodeProperties {
  target: SyntaxTerminalIdentifierNode;
  value: SyntaxLiteralNode | SyntaxPatternNode;
}

export type SyntaxNonTerminalRuleNode = AstNode<
  SyntaxNodeType.NonTerminalRule,
  SyntaxNonTerminalRuleNodeProperties
>;
export interface SyntaxNonTerminalRuleNodeProperties {
  target: SyntaxNonTerminalIdentifierNode;
  value: SyntaxExpressionNode;
}

export type SyntaxTerminalIdentifierNode = AstNode<
  SyntaxNodeType.TerminalIdentifier,
  SyntaxTerminalIdentifierNodeProperties
>;
export interface SyntaxTerminalIdentifierNodeProperties {
  name: string;
}

export type SyntaxNonTerminalIdentifierNode = AstNode<
  SyntaxNodeType.NonTerminalIdentifier,
  SyntaxNonTerminalIdentifierNodeProperties
>;
export interface SyntaxNonTerminalIdentifierNodeProperties {
  name: string;
}

export type SyntaxLiteralNode = AstNode<SyntaxNodeType.Literal, SyntaxLiteralNodeProperties>;
export interface SyntaxLiteralNodeProperties {
  value: string;
}

export type SyntaxPatternNode = AstNode<SyntaxNodeType.Pattern, SyntaxPatternNodeProperties>;
export interface SyntaxPatternNodeProperties {
  pattern: RegExp;
}

export type SyntaxEmptyNode = AstNode<SyntaxNodeType.Empty, SyntaxEmptyNodeProperties>;
export interface SyntaxEmptyNodeProperties {}

export type SyntaxListNode = AstNode<SyntaxNodeType.List, SyntaxListNodeProperties>;
export interface SyntaxListNodeProperties {
  item: SyntaxExpressionNode;
  separator: SyntaxExpressionNode;
}

export type SyntaxStructNode = AstNode<SyntaxNodeType.Struct, SyntaxStructNodeProperties>;
export interface SyntaxStructNodeProperties {
  fields: Array<SyntaxStructFieldNode>;
}

export type SyntaxStructFieldNode = AstNode<
  SyntaxNodeType.StructField,
  SyntaxStructFieldNodeProperties
>;
export interface SyntaxStructFieldNodeProperties {
  name: string | null;
  value: SyntaxExpressionNode;
}

export type SyntaxReadNode = AstNode<SyntaxNodeType.Read, SyntaxReadNodeProperties>;
export interface SyntaxReadNodeProperties {
  input: SyntaxChoiceNode | SyntaxSequenceNode | SyntaxAtomicExpressionNode;
}

export type SyntaxChoiceNode = AstNode<SyntaxNodeType.Choice, SyntaxChoiceNodeProperties>;
export interface SyntaxChoiceNodeProperties {
  alternatives: Array<SyntaxSequenceNode | SyntaxAtomicExpressionNode>;
}

export type SyntaxSequenceNode = AstNode<SyntaxNodeType.Sequence, SyntaxSequenceNodeProperties>;
export interface SyntaxSequenceNodeProperties {
  elements: Array<SyntaxAtomicExpressionNode>;
}

export enum SyntaxNodeAliasType {
  Rule = 'rule',
  Expression = 'expression',
  Token = 'token',
  AtomicExpression = 'atomicExpression',
  Identifier = 'identifier',
  Whitespace = 'whitespace',
  OptionalWhitespace = 'optionalWhitespace',
  StatementSeparator = 'statementSeparator',
}

interface SyntaxNodeAliases {
  [SyntaxNodeAliasType.Rule]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    SyntaxRuleNode
  >;
  [SyntaxNodeAliasType.Expression]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    SyntaxExpressionNode
  >;
  [SyntaxNodeAliasType.Token]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    SyntaxTokenNode
  >;
  [SyntaxNodeAliasType.AtomicExpression]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    SyntaxAtomicExpressionNode
  >;
  [SyntaxNodeAliasType.Identifier]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    SyntaxIdentifierNode
  >;
  [SyntaxNodeAliasType.Whitespace]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    [Token<SyntaxTokenType.Whitespace>, ...Array<Token<SyntaxTokenType.Whitespace>>]
  >;
  [SyntaxNodeAliasType.OptionalWhitespace]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    Array<Token<SyntaxTokenType.Whitespace>>
  >;
  [SyntaxNodeAliasType.StatementSeparator]: ParserRuleFactory<
    SyntaxTokenType,
    SyntaxNode,
    SyntaxNodeAliases,
    [
      Array<Token<SyntaxTokenType.Whitespace>> | null,
      Token<SyntaxTokenType.Newline>,
      Array<Token<SyntaxTokenType.Whitespace> | Token<SyntaxTokenType.Newline>> | null,
    ]
  >;
}

export type SyntaxRuleNodeType = SyntaxNodeType.TerminalRule | SyntaxNodeType.NonTerminalRule;
export type SyntaxRuleNode = Extract<SyntaxNode, { type: SyntaxRuleNodeType }>;

export type SyntaxTokenNodeType = SyntaxNodeType.Literal | SyntaxNodeType.Pattern;
export type SyntaxTokenNode = Extract<SyntaxNode, { type: SyntaxTokenNodeType }>;

export type SyntaxIdentifierNodeType =
  | SyntaxNodeType.TerminalIdentifier
  | SyntaxNodeType.NonTerminalIdentifier;
export type SyntaxIdentifierNode = Extract<SyntaxNode, { type: SyntaxIdentifierNodeType }>;

export type SyntaxAtomicExpressionNodeType = SyntaxIdentifierNodeType | SyntaxNodeType.Empty;
export type SyntaxAtomicExpressionNode = Extract<
  SyntaxNode,
  { type: SyntaxAtomicExpressionNodeType }
>;

export type SyntaxExpressionNodeType =
  | SyntaxNodeType.Struct
  | SyntaxNodeType.List
  | SyntaxNodeType.Read
  | SyntaxNodeType.Choice
  | SyntaxNodeType.Sequence
  | SyntaxAtomicExpressionNodeType;
export type SyntaxExpressionNode = Extract<SyntaxNode, { type: SyntaxExpressionNodeType }>;

export type SyntaxGrammar = Grammar<SyntaxTokenType, SyntaxNode>;

export const SyntaxGrammar = createGrammar<SyntaxTokenType, SyntaxNode, SyntaxNodeAliases>({
  tokens: {
    [SyntaxTokenType.Assign]: '<-',
    [SyntaxTokenType.Equals]: '::=',
    [SyntaxTokenType.OpenBracket]: '<',
    [SyntaxTokenType.CloseBracket]: '>',
    [SyntaxTokenType.OpenSquareBracket]: '[',
    [SyntaxTokenType.CloseSquareBracket]: ']',
    [SyntaxTokenType.OpenBrace]: '{',
    [SyntaxTokenType.CloseBrace]: '}',
    [SyntaxTokenType.Pipe]: '|',
    [SyntaxTokenType.Comma]: ',',
    [SyntaxTokenType.Colon]: ':',
    [SyntaxTokenType.Identifier]: /[^<>[\]{}:;,=|/\\" \t\n]+/,
    [SyntaxTokenType.Empty]: '""',
    [SyntaxTokenType.StringLiteral]: /"(?:[^"\\\n]|\\.)+"/,
    [SyntaxTokenType.RegExp]: /\/(?:[^/\\]+|\\.)*\//,
    [SyntaxTokenType.Whitespace]: /[ \t]+/,
    [SyntaxTokenType.Newline]: /\n+/,
  },
  rules: (_) => ({
    [SyntaxNodeType.Program]: ($) =>
      node(
        SyntaxNodeType.Program,
        struct<SyntaxTokenType, SyntaxProgramNodeProperties>(
          field(
            null,
            zeroOrMore(
              choice(
                token<SyntaxTokenType, SyntaxTokenType.Whitespace>(_.Whitespace),
                token<SyntaxTokenType, SyntaxTokenType.Newline>(_.Newline),
              ),
            ),
          ),
          field('rules', list($.rule, $.statementSeparator)),
          field(
            null,
            zeroOrMore(
              choice(
                token<SyntaxTokenType, SyntaxTokenType.Whitespace>(_.Whitespace),
                token<SyntaxTokenType, SyntaxTokenType.Newline>(_.Newline),
              ),
            ),
          ),
        ),
      ),
    [SyntaxNodeType.TerminalRule]: ($) =>
      node(
        SyntaxNodeType.TerminalRule,
        struct<SyntaxTokenType, SyntaxTerminalRuleNodeProperties>(
          field('target', $.TerminalIdentifier),
          field(null, $.optionalWhitespace),
          field(null, token(_.Equals)),
          field(null, $.optionalWhitespace),
          field('value', $.token),
        ),
      ),
    [SyntaxNodeType.TerminalIdentifier]: ($) =>
      node(
        SyntaxNodeType.TerminalIdentifier,
        struct<SyntaxTokenType, SyntaxTerminalIdentifierNodeProperties>(
          field('name', text(token(_.Identifier))),
        ),
      ),
    [SyntaxNodeType.NonTerminalRule]: ($) =>
      node(
        SyntaxNodeType.NonTerminalRule,
        struct<SyntaxTokenType, SyntaxNonTerminalRuleNodeProperties>(
          field('target', $.NonTerminalIdentifier),
          field(null, $.optionalWhitespace),
          field(null, token(_.Equals)),
          field(null, $.optionalWhitespace),
          field('value', $.expression),
        ),
      ),
    [SyntaxNodeType.NonTerminalIdentifier]: ($) =>
      node(
        SyntaxNodeType.NonTerminalIdentifier,
        struct<SyntaxTokenType, SyntaxNonTerminalIdentifierNodeProperties>(
          field(null, token(_.OpenBracket)),
          field(null, $.optionalWhitespace),
          field('name', text(token(_.Identifier))),
          field(null, $.optionalWhitespace),
          field(null, token(_.CloseBracket)),
        ),
      ),
    [SyntaxNodeType.Literal]: ($) =>
      node(
        SyntaxNodeType.Literal,
        struct<SyntaxTokenType, SyntaxLiteralNodeProperties>(
          field(
            'value',
            map(text(token(_.StringLiteral)), (value) => JSON.parse(value)),
          ),
        ),
      ),
    [SyntaxNodeType.Pattern]: ($) =>
      node(
        SyntaxNodeType.Pattern,
        struct<SyntaxTokenType, SyntaxPatternNodeProperties>(
          field(
            'pattern',
            map(text(token(_.RegExp)), (pattern) => new RegExp(pattern.replace(/^\/|\/$/g, ''))),
          ),
        ),
      ),
    [SyntaxNodeType.Empty]: ($) =>
      node(
        SyntaxNodeType.Empty,
        struct<SyntaxTokenType, SyntaxEmptyNodeProperties>(field(null, token(_.Empty))),
      ),
    [SyntaxNodeType.List]: ($) =>
      node(
        SyntaxNodeType.List,
        struct<SyntaxTokenType, SyntaxListNodeProperties>(
          field(null, token(_.OpenSquareBracket)),
          field(null, $.optionalWhitespace),
          field('item', $.expression),
          field(null, $.optionalWhitespace),
          field(null, token(_.Comma)),
          field(null, $.optionalWhitespace),
          field('separator', $.expression),
          field(null, $.optionalWhitespace),
          field(null, token(_.CloseSquareBracket)),
        ),
      ),
    [SyntaxNodeType.Struct]: ($) =>
      node(
        SyntaxNodeType.Struct,
        struct<SyntaxTokenType, SyntaxStructNodeProperties>(
          field(null, token(_.OpenBrace)),
          field(null, $.statementSeparator),
          field(
            'fields',
            list(
              $.StructField,
              sequence($.optionalWhitespace, token(_.Comma), $.statementSeparator),
            ),
          ),
          field(null, $.statementSeparator),
          field(null, token(_.CloseBrace)),
        ),
      ),
    [SyntaxNodeType.StructField]: ($) =>
      node(
        SyntaxNodeType.StructField,
        struct<SyntaxTokenType, SyntaxStructFieldNodeProperties>(
          field('name', optional(text(token(_.Identifier)))),
          field(null, $.optionalWhitespace),
          field(null, token(_.Colon)),
          field(null, $.optionalWhitespace),
          field('value', $.expression),
        ),
      ),
    [SyntaxNodeType.Read]: ($) =>
      node(
        SyntaxNodeType.Read,
        struct<SyntaxTokenType, SyntaxReadNodeProperties>(
          field(null, token(_.Assign)),
          field(null, $.optionalWhitespace),
          field('input', choice($.Choice, $.Sequence, $.atomicExpression)),
        ),
      ),
    [SyntaxNodeType.Sequence]: ($) =>
      node(
        SyntaxNodeType.Sequence,
        struct<SyntaxTokenType, SyntaxSequenceNodeProperties>(
          field('elements', list($.atomicExpression, $.whitespace, { minLength: 2 })),
        ),
      ),
    [SyntaxNodeType.Choice]: ($) =>
      node(
        SyntaxNodeType.Choice,
        struct<SyntaxTokenType, SyntaxChoiceNodeProperties>(
          field(
            'alternatives',
            list(
              choice($.Sequence, $.atomicExpression),
              sequence($.optionalWhitespace, token(_.Pipe), $.optionalWhitespace),
              { minLength: 2 },
            ),
          ),
        ),
      ),
    [SyntaxNodeAliasType.Rule]: ($) => choice($.TerminalRule, $.NonTerminalRule),
    [SyntaxNodeAliasType.Identifier]: ($) => choice($.TerminalIdentifier, $.NonTerminalIdentifier),
    [SyntaxNodeAliasType.AtomicExpression]: ($) => choice($.identifier, $.Empty),
    [SyntaxNodeAliasType.Expression]: ($) =>
      choice($.Struct, $.List, $.Read, $.Choice, $.Sequence, $.atomicExpression),
    [SyntaxNodeAliasType.Token]: ($) => choice($.Literal, $.Pattern),
    [SyntaxNodeAliasType.Whitespace]: ($) =>
      oneOrMore(token<SyntaxTokenType, SyntaxTokenType.Whitespace>(_.Whitespace)),
    [SyntaxNodeAliasType.OptionalWhitespace]: ($) =>
      zeroOrMore(token<SyntaxTokenType, SyntaxTokenType.Whitespace>(_.Whitespace)),
    [SyntaxNodeAliasType.StatementSeparator]: ($) =>
      sequence(
        $.optionalWhitespace,
        token(_.Newline),
        zeroOrMore(
          choice(
            token<SyntaxTokenType, SyntaxTokenType.Whitespace>(_.Whitespace),
            token<SyntaxTokenType, SyntaxTokenType.Newline>(_.Newline),
          ),
        ),
      ),
  }),
});
