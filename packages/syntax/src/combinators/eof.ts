import type { ParserRule, ParserRuleResult, TokenType } from '../grammar.ts';
import { ParseError } from '../parser.ts';
import { ResultType } from '../result.ts';

/**
 * Create combinator that succeeds only at the end of input.
 *
 * This combinator is useful for ensuring that all input has been consumed
 * and no unexpected tokens remain. It fails if there are any tokens left
 * in the input stream.
 *
 * @example
 * ```typescript
 * const completeProgram = sequence(
 *   programRule,
 *   eof()  // Ensure no trailing content
 * );
 * ```
 *
 * @template TToken The token type
 * @returns A parser rule that succeeds only at end of input
 */
export function eof<TToken extends TokenType>(): ParserRule<TToken, null> {
  return (state, helpers): ParserRuleResult<TToken, null> => {
    const { currentIndex, source } = state;
    const { readToken } = helpers;
    // If there are tokens remaining, return an error
    const token = readToken(currentIndex);
    if (token !== null) {
      return {
        type: ResultType.Error,
        error: new ParseError('Expected end of input', source, token.location),
      };
    }
    // Return a success result with the state unchanged
    return {
      type: ResultType.Success,
      value: {
        ...state,
        value: null,
        tokens: [],
      },
    };
  };
}
