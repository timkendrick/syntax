import {
  ParserRuleError,
  type ParserRule,
  type ParserRuleOutputState,
  type ParserRuleResult,
  type Token,
  type TokenType,
} from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that matches a specific token type.
 *
 * This is the fundamental combinator for consuming input. It matches a single
 * token of the specified type, advancing the parser position by one token.
 * If the current token doesn't match the expected type, parsing fails.
 *
 * @example
 * ```typescript
 * const numberToken = token('NUMBER');
 * const plusToken = token('PLUS');
 * ```
 *
 * @template T The full token type union
 * @template V The specific token type to match
 * @param type The token type to match
 * @returns A parser rule that succeeds if the current token matches the type
 */
export function token<T extends TokenType, V extends T>(type: V): ParserRule<T, Token<V>> {
  return (state, helpers): ParserRuleResult<T, Token<V>> => {
    const { readToken, isTokenType, eof } = helpers;
    const { currentIndex } = state;
    // Read the next token from the input stream
    const token = readToken(currentIndex);
    // If it is not of the expected type (or if there were no tokens remaining), return an error
    if (token === null || !isTokenType(token, type)) {
      return {
        type: ResultType.Error,
        error: new ParserRuleError(`Expected token: ${String(type)}`, token?.location ?? eof),
      };
    }
    // Otherwise return a success result containing the matched token, consuming it from the input
    const resultState: ParserRuleOutputState<T, Token<V>> = {
      ...state,
      value: token,
      tokens: [token],
      currentIndex: currentIndex + 1,
    };
    return {
      type: ResultType.Success,
      value: resultState,
    };
  };
}
