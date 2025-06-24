import {
  extendGrammar,
  type AnyAstNode,
  type AstNode,
  type Grammar,
  type Location,
  type ParserRuleFactory,
  type ParserRuleHelpers,
  type ParserRuleInputState,
  type Token,
  type TokenParser,
  type TokenType,
} from './grammar.ts';
import { ResultType, type Result } from './result.ts';

export class Parser<TToken extends TokenType, TNode extends AnyAstNode> {
  private readonly grammar: Grammar<TToken, TNode>;

  constructor(grammar: Grammar<TToken, TNode>) {
    this.grammar = grammar;
  }

  public tokenize(input: string): LexerResult<TToken> {
    const state: LexerState<TToken> = {
      input,
      tokens: [],
      currentIndex: 0,
    };
    const tokenParsers = (Reflect.ownKeys(this.grammar.tokenTypes) as Array<TToken>).map(
      (key): [TToken, TokenParser] => [key, this.grammar.tokenTypes[key]],
    );
    loop: while (state.currentIndex < input.length) {
      const { currentIndex } = state;
      // Attempt to parse the current token with each token parser in turn
      // (for now we ignore the possibility of ambiguity / precedence)
      for (const [tokenType, tokenParser] of tokenParsers) {
        const result = tokenParser(state);
        if (result === null) continue;
        const { currentIndex: nextIndex } = result;
        const token: Token<TToken> = {
          type: tokenType,
          location: {
            start: currentIndex,
            end: nextIndex,
          },
        };
        state.tokens.push(token);
        state.currentIndex = nextIndex;
        continue loop;
      }
      return {
        type: ResultType.Error,
        error: new ParseError('Unrecognized token', input, {
          start: currentIndex,
          end: currentIndex + 1,
        }),
      };
    }
    return { type: ResultType.Success, value: state.tokens };
  }

  public parse<TRoot extends TNode>(
    input: Array<Token<TToken>>,
    source: string,
    rootNodeType: TRoot['type'],
  ): ParseResult<TRoot> {
    const state: ParserRuleInputState<TToken> = {
      input,
      source,
      currentIndex: 0,
    };
    const eof: Location = {
      start: source.length,
      end: source.length,
    };
    const helpers: ParserRuleHelpers<TToken> = {
      eof,
      readToken(index: number): Token<TToken> | null {
        if (index >= input.length) return null;
        return input[index];
      },
      isTokenType<V extends TToken>(
        token: Token<TToken>,
        type: V,
      ): token is typeof token & { type: V } {
        return token.type === type;
      },
      getTokenSource(token: Token<TToken>): string {
        return source.slice(token.location.start, token.location.end);
      },
    };
    const parser = this.grammar.rules[rootNodeType];
    const result = parser(state, helpers);
    if (result.type === ResultType.Error) {
      return {
        type: ResultType.Error,
        error: new ParseError(result.error.message, source, result.error.location, {
          cause: result.error,
        }),
      };
    }
    const resultState = result.value;
    const { value: node } = resultState;
    if (resultState.currentIndex !== input.length) {
      const nextToken = input[resultState.currentIndex].location;
      return {
        type: ResultType.Error,
        error: new ParseError('Expected end of input', source, nextToken),
      };
    }
    const root = node as TNode & { type: TRoot['type'] } as TRoot;
    return { type: ResultType.Success, value: root };
  }
}

export interface LexerState<TToken extends TokenType> {
  readonly input: string;
  readonly tokens: Array<Token<TToken>>;
  currentIndex: number;
}

export type LexerResult<TToken extends TokenType> = Result<Array<Token<TToken>>, ParseError>;

export class ParseError extends Error {
  public readonly source: string;
  public readonly location: Location;

  public constructor(message: string, source: string, location: Location, options?: ErrorOptions) {
    const formattedMessage = formatErrorMessage(message, source, location);
    super(formattedMessage, options);
    this.source = source;
    this.location = location;
    this.name = 'ParseError';
    Object.setPrototypeOf(this, ParseError.prototype);
  }
}

export function formatErrorMessage(message: string, source: string, location: Location): string {
  const sourceSpan = findSourceSpan(source, location);
  const sourceSnippet = formatSourceSnippet(source, location);
  return `${message}${sourceSpan ? ` at [${sourceSpan.start.line}:${sourceSpan.start.column}]` : ''}${sourceSnippet ? `\n${sourceSnippet}` : ''}`;
}

interface SourceSpan {
  start: SourceLocation;
  end: SourceLocation;
}

interface SourceLocation {
  /** The line number of the location, starting at 1. */
  line: number;
  /** The column number of the location, starting at 1. */
  column: number;
}

/** The offsets of each line as indexes in the source string, with the first line at index 0. */
type SourceLineRanges = [SourceLineRange & { start: 0 }, ...Array<SourceLineRange>];

interface SourceLineRange {
  start: number;
  end: number;
}

export function findSourceSpan(source: string, location: Location): SourceSpan | null {
  const start = findSourceLocation(source, location.start);
  const end = findSourceLocation(source, location.end);
  if (start === null || end === null) {
    if (start !== null) return { start, end: start };
    if (end !== null) return { start: end, end };
    return null;
  }
  return { start, end };
}

export function findSourceLocation(source: string, offset: number): SourceLocation | null {
  if (offset <= 0) return { line: 1, column: 1 };
  const lineOffsets = findSourceLineOffsets(source);
  const lineIndex = getLineIndex(lineOffsets, offset);
  if (lineIndex === null) {
    const endOffset = source.length;
    const lastLineIndex = lineOffsets.length - 1;
    return getSourceLocation(lineOffsets, lastLineIndex, endOffset);
  }
  return getSourceLocation(lineOffsets, lineIndex, offset);
}

const SOURCE_LINE_BREAK_PATTERN = /\r?\n/;

function getSourceLocation(
  lineOffsets: SourceLineRanges,
  lineIndex: number,
  offset: number,
): SourceLocation {
  const { start: lineOffset } = lineOffsets[lineIndex];
  const columnOffset = offset - lineOffset;
  return { line: 1 + lineIndex, column: 1 + columnOffset };
}

function findSourceLineOffsets(source: string): SourceLineRanges {
  const matches = Array.from(source.matchAll(new RegExp(SOURCE_LINE_BREAK_PATTERN, 'g')));
  return [
    { start: 0, end: matches.length > 0 ? matches[0].index : source.length },
    ...matches.map((match, index) => ({
      start: match.index + match.length,
      end: index < matches.length - 1 ? matches[index + 1].index : source.length,
    })),
  ];
}

function getLineIndex(lineOffsets: SourceLineRanges, offset: number): number | null {
  if (offset < 0 || offset > lineOffsets[lineOffsets.length - 1].end) return null;
  const lineIndex = lineOffsets.findIndex(
    (lineOffset) => offset >= lineOffset.start && offset <= lineOffset.end,
  );
  if (lineIndex === -1) return null;
  return lineIndex;
}

export function formatSourceSnippet(source: string, location: Location): string | null {
  const lineOffsets = findSourceLineOffsets(source);
  const startLineIndex = getLineIndex(lineOffsets, location.start);
  const endLineIndex = getLineIndex(lineOffsets, location.end);
  if (startLineIndex === null || endLineIndex === null) return null;
  const sourceLines = lineOffsets
    .slice(startLineIndex, endLineIndex + 1)
    .map((range, index) => ({ index: startLineIndex + index, range }));
  const lineNumberWidth = String(endLineIndex + 1).length;
  return sourceLines
    .flatMap(({ index: lineIndex, range: lineRange }) => {
      const lineNumber = String(lineIndex + 1).padStart(lineNumberWidth, ' ');
      const gutterMarker = `${lineNumber} |`;
      const gutterWidth = gutterMarker.length;
      return [
        gutterMarker,
        source.slice(lineRange.start, lineRange.end),
        '\n',
        ' '.repeat(gutterWidth),
        formatSourceMarker(lineRange, location),
      ].join('');
    })
    .join('\n');
}

function formatSourceMarker(lineRange: { start: number; end: number }, location: Location): string {
  const { start: lineStart, end: lineEnd } = lineRange;
  const { start: locationStart, end: locationEnd } = location;
  const numLeadingSpaces = Math.max(0, locationStart - lineStart);
  const numTrailingSpaces = Math.max(0, lineEnd - locationEnd);
  const lineLength = lineEnd - lineStart;
  const numMarkers = Math.max(1, lineLength - numLeadingSpaces - numTrailingSpaces);
  return ' '.repeat(numLeadingSpaces) + '^'.repeat(numMarkers);
}

export type ParseResult<TRoot extends AnyAstNode> = Result<TRoot, ParseError>;

export function createParser<
  TToken extends TokenType,
  TNode extends AnyAstNode,
  TRoot extends TNode,
>(
  grammar: Grammar<TToken, TNode>,
  rootNodeType: TRoot['type'],
): (input: string) => ParseResult<TRoot> {
  return (input: string): ParseResult<TRoot> => parse(input, grammar, rootNodeType);
}

export function parse<TToken extends TokenType, TNode extends AnyAstNode, TRoot extends TNode>(
  input: string,
  grammar: Grammar<TToken, TNode>,
  rootNodeType: TRoot['type'],
): ParseResult<TRoot> {
  const parser = new Parser<TToken, TNode>(grammar);
  const lexerResult = parser.tokenize(input);
  if (lexerResult.type === ResultType.Error) return lexerResult;
  const parserResult = parser.parse(lexerResult.value, input, rootNodeType);
  if (parserResult.type === ResultType.Error) return parserResult;
  return parserResult;
}

type WithPatternMatcherRootNode<TNode extends AnyAstNode, TValue> =
  | TNode
  | PatternMatcherRootNode<TValue>;

const PatternMatcherRootNodeType: unique symbol = Symbol('ROOT');
type PatternMatcherRootNodeType = typeof PatternMatcherRootNodeType;

type PatternMatcherRootNode<TValue> = AstNode<
  PatternMatcherRootNodeType,
  PatternMatcherRootNodeProperties<TValue>
>;

interface PatternMatcherRootNodeProperties<TValue> {
  value: TValue;
}

export type PatternMatcher<TValue> = (
  input: string,
) => Result<{ match: TValue; tokens: Array<Location> }, ParseError>;

export function createPatternMatcher<TToken extends TokenType, TNode extends AnyAstNode, TValue>(
  grammar: Grammar<TToken, TNode>,
  pattern: (tokens: { [K in TToken]: K }) => ParserRuleFactory<
    TToken,
    WithPatternMatcherRootNode<TNode, TValue>,
    object,
    TValue
  >,
): PatternMatcher<TValue> {
  const tokenTypeNames = Object.fromEntries(
    (Reflect.ownKeys(grammar.tokenTypes) as Array<TToken>).map((key) => [key, key]),
  ) as { [K in TToken]: K };
  const ruleFactory = pattern(tokenTypeNames);
  const mergedGrammar = extendGrammar<TToken, TNode, PatternMatcherRootNode<TValue>, object>(
    grammar,
    {
      [PatternMatcherRootNodeType]: (($) => {
        const rule = ruleFactory($);
        return (state, helpers) => {
          const result = rule(state, helpers);
          if (result.type === ResultType.Error) return result;
          const resultState = result.value;
          const { value, tokens } = resultState;
          const node: PatternMatcherRootNode<TValue> = {
            type: PatternMatcherRootNodeType,
            properties: { value },
            tokens: tokens.map(({ location }) => location),
          };
          return {
            type: ResultType.Success,
            value: {
              ...resultState,
              value: node,
            },
          };
        };
      }) as ParserRuleFactory<
        TToken,
        WithPatternMatcherRootNode<TNode, TValue>,
        object,
        PatternMatcherRootNode<TValue>
      >,
    },
  );
  return (input: string): Result<{ match: TValue; tokens: Array<Location> }, ParseError> => {
    const result = parse<
      TToken,
      WithPatternMatcherRootNode<TNode, TValue>,
      PatternMatcherRootNode<TValue>
    >(input, mergedGrammar, PatternMatcherRootNodeType);
    if (result.type === ResultType.Error) return result;
    const {
      properties: { value },
      tokens,
    } = result.value;
    return {
      type: ResultType.Success,
      value: { match: value, tokens: tokens ?? [] },
    };
  };
}
