import type { Result } from './result.ts';

export type AnyAstNode = AstNode<AstNodeType, object>;
export type AnyGrammar = Grammar<TokenType, AnyAstNode>;

export type TokenType = PropertyKey;

export interface TokenParser {
  (state: TokenParserState): TokenParserResult;
}

export interface TokenParserState {
  readonly input: string;
  currentIndex: number;
}

export type TokenParserResult = TokenParserState | null;

export interface Token<T extends TokenType> {
  type: T;
  location: Location;
}

export interface Location {
  start: number;
  end: number;
}

export interface AstNode<T extends AstNodeType, P extends object> {
  type: T;
  properties: P;
  tokens: Array<Location> | null;
}

export interface TokenTree extends Array<Location | TokenTree> {}

export interface ParserRule<TToken extends TokenType, TValue> {
  (
    state: ParserRuleInputState<TToken>,
    helpers: ParserRuleHelpers<TToken>,
  ): ParserRuleResult<TToken, TValue>;
}

export type ParserRuleOutput<T extends ParserRule<TToken, unknown>, TToken extends TokenType> =
  T extends ParserRule<TokenType, infer TValue> ? TValue : never;

export type ParserRuleResult<TToken extends TokenType, TValue> = Result<
  ParserRuleOutputState<TToken, TValue>,
  ParserRuleError
>;

export interface ParserRuleInputState<TToken extends TokenType> {
  readonly input: ReadonlyArray<Token<TToken>>;
  readonly source: string;
  readonly currentIndex: number;
}

export interface ParserRuleOutputState<TToken extends TokenType, TValue>
  extends ParserRuleInputState<TToken> {
  readonly value: TValue;
  readonly tokens: Array<Token<TToken>>;
}

export interface AstPathKey<TNode extends AnyAstNode> {
  type: TNode['type'];
  key: PropertyKey;
  index: number | null;
}

export class ParserRuleError extends Error {
  public readonly location: Location;

  public constructor(message: string, location: Location, options?: ErrorOptions) {
    super(message, options);
    this.location = location;
    this.name = 'AstNodeParserError';
    Object.setPrototypeOf(this, ParserRuleError.prototype);
  }
}

export type AstNodeType = PropertyKey;

export type NamedAstNode<TNode extends AnyAstNode, K extends TNode['type']> = Extract<
  TNode,
  { type: K }
>;

export interface Grammar<TToken extends TokenType, TNode extends AnyAstNode> {
  readonly tokenTypes: { [K in TToken]: TokenParser };
  readonly rules: {
    [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>>;
  };
  readonly [TOKEN_TYPE]: TToken;
  readonly [NODE_TYPE]: TNode;
}
declare const TOKEN_TYPE: unique symbol;
declare const NODE_TYPE: unique symbol;

export type GetTokenType<T extends AnyGrammar> = T[typeof TOKEN_TYPE];
export type GetAstNode<T extends AnyGrammar> = T[typeof NODE_TYPE];

export interface ParserRuleHelpers<TToken extends TokenType> {
  readonly eof: Location;
  readToken(this: void, index: number): Token<TToken> | null;
  isTokenType<V extends TToken>(
    this: void,
    token: Token<TToken>,
    type: V,
  ): token is typeof token & { type: V };
  getTokenSource(this: void, token: Token<TToken>): string;
}

export type ParserRuleFactory<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
  TValue,
> = (
  rules: {
    [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>>;
  } & {
    [K in keyof TAliasRules]: ParserRule<
      TToken,
      ParserRuleFactoryOutput<TAliasRules[K], TToken, TNode, TAliasRules>
    >;
  },
) => ParserRule<TToken, TValue>;

export type ParserRuleFactoryOutput<
  T extends ParserRuleFactory<TToken, TNode, TAliasRules, unknown>,
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
> = T extends ParserRuleFactory<TToken, TNode, TAliasRules, infer TValue> ? TValue : never;

export type AstParserRules<
  TNode extends AnyAstNode,
  TToken extends TokenType,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
> = AstNodeParserRules<TNode, TToken, TAliasRules> & TAliasRules;

export type AstNodeParserRules<
  TNode extends AnyAstNode,
  TToken extends TokenType,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
> = {
  [K in TNode['type']]: AstNodeParserRule<TToken, TNode, TAliasRules, K>;
};

export type AstNodeParserRule<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
  T extends TNode['type'],
> = ParserRuleFactory<TToken, TNode, TAliasRules, NamedAstNode<TNode, T>>;

export type GrammarFactory<TToken extends TokenType> = <
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
>(
  factory: (tokens: {
    [K in TToken]: K;
  }) => AstParserRules<TNode, TToken, TAliasRules>,
) => Grammar<TToken, TNode>;

/**
 * Create a grammar programmatically using parser combinators.
 *
 * This is the low-level API for building grammars directly with parser combinators,
 * as opposed to using the high-level BNF-style syntax DSL. Provides full control
 * over parser rule construction and can be used to build grammars that would be
 * difficult to express in the DSL.
 *
 * @example
 * ```typescript
 * const grammar = createGrammar({
 *   tokens: {
 *     NUMBER: /\d+/,
 *     PLUS: '+',
 *     MULTIPLY: '*'
 *   },
 *   rules: (tokens) => ({
 *     Expression: (rules) => choice(
 *       rules.Addition,
 *       rules.Number
 *     ),
 *     Addition: (rules) => struct(
 *       field('left', rules.Number),
 *       field(null, token(tokens.PLUS)),
 *       field('right', rules.Expression)
 *     ),
 *     Number: (rules) => struct(
 *       field('value', text(token(tokens.NUMBER)))
 *     )
 *   })
 * });
 * ```
 *
 * @template TToken The union type of token names
 * @template TNode The union type of AST node types
 * @template TAliasRules Helper rules that don't produce AST nodes
 * @param definition Grammar definition with tokens and rule factories
 * @returns A Grammar object that can be used with the parser
 */
export function createGrammar<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
>(definition: {
  tokens: {
    [K in TToken]: RegExp | string | TokenParser;
  };
  rules: (tokens: {
    [K in TToken]: K;
  }) => AstParserRules<TNode, TToken, TAliasRules>;
}): Grammar<TToken, TNode> {
  const { tokens, rules: rulesFactory } = definition;
  // Create a map of token parsers from the grammar definition
  const tokenTypes = Object.fromEntries(
    (Reflect.ownKeys(tokens) as Array<TToken>).map((key) => {
      const pattern = tokens[key];
      return [key, typeof pattern === 'function' ? pattern : createTokenParser(pattern)];
    }),
  ) as {
    [K in TToken]: TokenParser;
  };
  // Instantiate the rule definitions, providing the token type names to be used in rule definitions
  const tokenTypeNames = Object.fromEntries(
    (Reflect.ownKeys(tokens) as Array<TToken>).map((key) => [key, key]),
  ) as { [K in TToken]: K };
  const ruleDefinitions = rulesFactory(tokenTypeNames);
  // Grammar rules can be defined recursively, so we need to create lazy accessors to allow
  // accessing not-yet-instantiated rules in other rule definitions
  const ruleAccessors = createLazyRuleAccessors<TToken, TNode, TAliasRules>(ruleDefinitions);
  const grammar = { tokenTypes, rules: ruleAccessors };
  return grammar as typeof grammar & {
    [TOKEN_TYPE]: TToken;
    [NODE_TYPE]: TNode;
  };
}

function createLazyRuleAccessors<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
>(
  ruleDefinitions: AstParserRules<TNode, TToken, TAliasRules>,
): {
  [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>>;
} & {
  [K in keyof TAliasRules]: ParserRule<
    TToken,
    ParserRuleFactoryOutput<TAliasRules[K], TToken, TNode, TAliasRules>
  >;
} {
  // Create a backing object that will be used to store the actual rule instances once instantiated
  // (this will be populated with the results of the rule factories)
  const ruleInstances = {} as {
    [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>>;
  } & {
    [K in keyof TAliasRules]: ParserRule<
      TToken,
      ParserRuleFactoryOutput<TAliasRules[K], TToken, TNode, TAliasRules>
    >;
  };
  // Create a 'proxy' object containing a set of lazy accessors to the underlying rule instances
  // (this is what will be passed to the rule factories so that rules can access other rules)
  const rules = Object.fromEntries(
    (Reflect.ownKeys(ruleDefinitions) as Array<keyof TNode['type'] | keyof TAliasRules>).map(
      (key) => [
        key,
        createLazyRuleAccessor<TToken, TNode, TAliasRules, typeof key>(ruleInstances, key),
      ],
    ),
  ) as {
    [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>>;
  } & {
    [K in keyof TAliasRules]: ParserRule<
      TToken,
      ParserRuleFactoryOutput<TAliasRules[K], TToken, TNode, TAliasRules>
    >;
  };
  // Instantiate each rule factory, writing the results to the backing object
  for (const [key, ruleFactory] of (
    Reflect.ownKeys(ruleDefinitions) as Array<TNode['type'] | keyof TAliasRules>
  ).map((key) => [key, ruleDefinitions[key]]) as Array<
    | [keyof TNode['type'], AstNodeParserRules<TNode, TToken, TAliasRules>[keyof TNode['type']]]
    | [keyof TAliasRules, TAliasRules[keyof TAliasRules]]
  >) {
    ruleInstances[key] = ruleFactory(rules) as (typeof ruleInstances)[typeof key];
  }
  return rules;
}

function createLazyRuleAccessor<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<TToken, TNode, TAliasRules, unknown>;
  },
  TKey extends keyof TNode['type'] | keyof TAliasRules,
>(
  ruleInstances: { [K in TNode['type']]: ParserRule<TToken, NamedAstNode<TNode, K>> } & {
    [K in keyof TAliasRules]: ParserRule<
      TToken,
      ParserRuleFactoryOutput<TAliasRules[K], TToken, TNode, TAliasRules>
    >;
  },
  key: TKey,
): ParserRule<
  TToken,
  TKey extends keyof TNode['type']
    ? NamedAstNode<TNode, TKey>
    : TKey extends keyof TAliasRules
      ? ParserRuleFactoryOutput<TAliasRules[TKey], TToken, TNode, TAliasRules>
      : never
> {
  return (state: ParserRuleInputState<TToken>, helpers: ParserRuleHelpers<TToken>) => {
    // By the time this function is entered, the rule will have been instantiated
    const ruleInstance = ruleInstances[key];
    return ruleInstance(state, helpers) as ParserRuleResult<
      TToken,
      TKey extends keyof TNode['type']
        ? NamedAstNode<TNode, TKey>
        : TKey extends keyof TAliasRules
          ? ParserRuleFactoryOutput<TAliasRules[TKey], TToken, TNode, TAliasRules>
          : never
    >;
  };
}

export function createTokenParser(pattern: RegExp | string): TokenParser {
  const regex = typeof pattern === 'string' ? new RegExp(escapeRegExpSource(pattern)) : pattern;
  return (state: TokenParserState): TokenParserResult => {
    const { input, currentIndex } = state;
    const matcher = createRegExpAnchoredAtIndex(regex, currentIndex);
    if (!matcher.test(input)) return null;
    state.currentIndex = matcher.lastIndex;
    return state;
  };
}

function createRegExpAnchoredAtIndex(pattern: RegExp, index: number): RegExp {
  return Object.assign(new RegExp(pattern, 'y'), { lastIndex: index });
}

const REGEXP_SPECIAL_CHAR = /[.*+?^${}()|[\]\\]/;

function escapeRegExpSource(string: string): string {
  if (!REGEXP_SPECIAL_CHAR.test(string)) return string;
  return string.replace(new RegExp(REGEXP_SPECIAL_CHAR, 'g'), '\\$&');
}

export function extendGrammar<
  TToken extends TokenType,
  TExistingNode extends AnyAstNode,
  TExtendedNode extends AnyAstNode,
  TAliasRules extends {
    [K in keyof TAliasRules]: ParserRuleFactory<
      TToken,
      TExistingNode | TExtendedNode,
      TAliasRules,
      unknown
    >;
  },
>(
  grammar: Grammar<TToken, TExistingNode>,
  rules: {
    [K in TExtendedNode['type']]: ParserRuleFactory<
      TToken,
      TExistingNode | TExtendedNode,
      TAliasRules,
      NamedAstNode<TExtendedNode, K>
    >;
  } & TAliasRules,
) {
  return {
    ...grammar,
    rules: {
      ...grammar.rules,
      ...createLazyRuleAccessors<TToken, TExistingNode | TExtendedNode, TAliasRules>(rules),
    },
  };
}
