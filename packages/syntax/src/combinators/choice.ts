import {
  ParserRuleError,
  type ParserRule,
  type ParserRuleResult,
  type TokenType,
} from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that tries multiple rules and succeeds with the first match.
 *
 * Attempts each rule in order against the same input state. The first rule to succeed
 * determines the result. If all rules fail, returns the error from the rule that
 * advanced furthest in the input (likely the intended parse path).
 *
 * @example
 * ```typescript
 * const numberOrString = choice(
 *   map(token('NUMBER'), value => ({ type: 'number', value })),
 *   map(token('STRING'), value => ({ type: 'string', value }))
 * );
 * ```
 *
 * @template TToken The token type
 * @template TValues Array of value types returned by each rule
 * @param rules The parser rules to try in order
 * @returns A parser rule that succeeds with the first matching rule's result
 */
export function choice<TToken extends TokenType, TValues extends Array<unknown>>(
  ...rules: [...{ [K in keyof TValues]: ParserRule<TToken, TValues[K]> }]
): ParserRule<TToken, TValues[number]> {
  return (state, helpers): ParserRuleResult<TToken, TValues[number]> => {
    const { currentIndex } = state;
    const { readToken, eof } = helpers;
    // Keep track of the 'best' error encountered, where 'best' is defined as the error that
    // progresses furthest in the input stream (this is the error that will ultimately be returned)
    let currentError: { error: ParserRuleError; index: number } | null = null;
    // Try each rule in order
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      const result = rule(state, helpers);
      // First successful rule wins: update the original state and return the result
      if (result.type === ResultType.Success) {
        const resultState = result.value;
        return { type: ResultType.Success, value: resultState };
      }
      // Rule failed - if this is the furthest we've progressed so far, update the furthest error
      const errorLocation = result.error.location.start;
      if (!currentError) {
        currentError = { error: result.error, index: errorLocation };
      } else if (errorLocation > currentError.index) {
        currentError = { error: result.error, index: errorLocation };
      }
    }
    // If no error was encountered, this indicates that there were no choices specified.
    if (!currentError) {
      const currentToken = readToken(currentIndex);
      return {
        type: ResultType.Error,
        error: new ParserRuleError('No choices available', currentToken?.location ?? eof),
      };
    }

    // All rules failed - return the error from the rule that advanced furthest
    return {
      type: ResultType.Error,
      error: currentError.error,
    };
  };
}
