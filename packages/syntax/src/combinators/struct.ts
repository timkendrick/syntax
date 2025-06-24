import type { ParserRule, TokenType } from '../grammar.ts';

import { map } from './map.ts';
import { sequence } from './sequence.ts';

/**
 * Create a combinator that builds objects from named fields.
 *
 * Applies a sequence of field descriptors and constructs a structured object
 * from the results. Fields with null keys are ignored (parsed but not stored).
 * This is the primary way to construct AST node properties.
 *
 * @example
 * ```typescript
 * const addition = struct(
 *   field('left', token('NUMBER')),
 *   field(null, token('PLUS')),      // Ignored field
 *   field('right', token('NUMBER'))
 * );
 * // Returns: { left: Token, right: Token }
 * ```
 *
 * @template TToken The token type
 * @template TFields The object type with field names and value types
 * @param fields Array of field descriptors created with field()
 * @returns A parser rule that constructs a structured object
 */
export function struct<
  TToken extends TokenType,
  TFields extends {
    [K in keyof TFields]: unknown;
  },
>(
  ...fields: Array<
    | {
        [K in keyof TFields]: StructFieldDescriptor<TToken, K, TFields[K]>;
      }[keyof TFields]
    | StructFieldDescriptor<TToken, null, unknown>
  >
): ParserRule<TToken, TFields> {
  // Match the sequence of fields in the specified order, mapping the resulting array into a record
  return map(sequence(...fields.map(({ rule }) => rule)), (values) => {
    // Build up a record of field values by iterating over each field and its corresponding value,
    // skipping over any fields with null keys
    const fieldValues = {} as TFields;
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      if (field.key === null) continue;
      const value = values[i] as TFields[keyof TFields];
      fieldValues[field.key] = value;
    }
    return fieldValues;
  });
}

export interface StructFieldDescriptor<
  TToken extends TokenType,
  TKey extends PropertyKey | null,
  TValue,
> {
  key: TKey;
  rule: ParserRule<TToken, TValue>;
  readonly [STRUCT_FIELD]: true;
}
declare const STRUCT_FIELD: unique symbol;

/**
 * Create a field descriptor for use with struct combinator.
 *
 * Associates a parser rule with a property key. Fields with null keys are
 * parsed but not included in the final object (useful for ignored tokens
 * like punctuation).
 *
 * @example
 * ```typescript
 * field('name', token('IDENTIFIER'))     // Named field
 * field(null, token('SEMICOLON'))        // Ignored field
 * ```
 *
 * @template TToken The token type
 * @template TKey The property key (or null for ignored fields)
 * @template TValue The value type returned by the rule
 * @param key The property key to use in the struct, or null to ignore
 * @param rule The parser rule to apply for this field
 * @returns A field descriptor for use with struct()
 */
export function field<TToken extends TokenType, TKey extends PropertyKey | null, TValue>(
  key: TKey,
  rule: ParserRule<TToken, TValue>,
): StructFieldDescriptor<TToken, TKey, TValue> {
  const descriptor = { key, rule };
  return descriptor as typeof descriptor & { [STRUCT_FIELD]: true };
}
