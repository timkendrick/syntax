import type { ParserRule, ParserRuleOutputState, ParserRuleResult, TokenType } from '../grammar.ts';
import { ResultType } from '../result.ts';

/**
 * Create a combinator that transforms successful parse results.
 *
 * Applies a transformation function to the result of a successful parse,
 * allowing you to convert parsed values into different types or shapes.
 * If the inner rule fails, the error is propagated unchanged.
 *
 * @example
 * ```typescript
 * // Convert string token to number
 * const numberValue = map(
 *   token('NUMBER'),
 *   (token) => parseInt(token.value)
 * );
 *
 * // Extract nested property
 * const identifier = map(
 *   identifierRule,
 *   (node) => node.properties.name
 * );
 * ```
 *
 * @template TToken The token type
 * @template TInput The input type from the inner rule
 * @template TOutput The output type after transformation
 * @param rule The parser rule to apply
 * @param transform Function to transform successful results
 * @returns A parser rule that returns the transformed value
 */
export function map<TToken extends TokenType, TInput, TOutput>(
  rule: ParserRule<TToken, TInput>,
  transform: (value: TInput) => TOutput,
): ParserRule<TToken, TOutput> {
  return (state, helpers): ParserRuleResult<TToken, TOutput> => {
    // Delegate matching to the inner rule
    const result = rule(state, helpers);
    if (result.type === ResultType.Error) return result;
    // Transform the successful result
    const resultState = result.value;
    const { value } = resultState;
    const transformedValue = transform(value);
    const transformedResultState: ParserRuleOutputState<TToken, TOutput> = {
      ...resultState,
      value: transformedValue,
    };
    return {
      type: ResultType.Success,
      value: transformedResultState,
    };
  };
}
