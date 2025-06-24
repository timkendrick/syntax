import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { field, struct } from './struct.ts';
import { token } from './token.ts';

describe(struct, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
    OpenParen = 'OpenParen',
    CloseParen = 'CloseParen',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
      [TestTokenType.OpenParen]: '(',
      [TestTokenType.CloseParen]: ')',
    },
    rules: (_) => ({}),
  });

  describe('empty struct', () => {
    type TestMatcherResult = object;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => struct(),
    );

    it.each([
      {
        label: 'empty struct with empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: {},
            tokens: [],
          },
        },
      },
      {
        label: 'empty struct with non-empty input',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('single field struct', () => {
    type TestMatcherResult = { value: Token<TestTokenType.Foo> };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => struct(field('value', token<TestTokenType, TestTokenType.Foo>(_.Foo))),
    );

    it.each([
      {
        label: 'single field struct success',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              value: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'single field struct failure',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('multiple field struct', () => {
    type TestMatcherResult = {
      first: Token<TestTokenType.Foo>;
      second: Token<TestTokenType.Bar>;
    };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        struct(
          field('first', token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          field('second', token<TestTokenType, TestTokenType.Bar>(_.Bar)),
        ),
    );

    it.each([
      {
        label: 'multiple field struct success',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              first: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              second: {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'multiple field struct failure at first field',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 3 },
          }),
        },
      },
      {
        label: 'multiple field struct failure at second field',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 3, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('struct with optional fields', () => {
    type TestMatcherResult = {
      required: Token<TestTokenType.Foo>;
      optional: Token<TestTokenType.Bar> | null;
    };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        struct(
          field('required', token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          field('optional', optional(token<TestTokenType, TestTokenType.Bar>(_.Bar))),
        ),
    );

    it.each([
      {
        label: 'struct with optional field present',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              required: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              optional: {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'struct with optional field absent',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              required: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              optional: null,
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'struct with required field missing',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('struct with different field types', () => {
    type TestMatcherResult = {
      single: Token<TestTokenType.Foo>;
      pair: [Token<TestTokenType.Bar>, Token<TestTokenType.Baz>];
      optional: Token<TestTokenType.Foo> | null;
    };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        struct(
          field('single', token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          field(
            'pair',
            sequence(
              token<TestTokenType, TestTokenType.Bar>(_.Bar),
              token<TestTokenType, TestTokenType.Baz>(_.Baz),
            ),
          ),
          field('optional', optional(token<TestTokenType, TestTokenType.Foo>(_.Foo))),
        ),
    );

    it.each([
      {
        label: 'all fields present',
        matcher: TestMatcher,
        input: 'foobarbazfoo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              single: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              pair: [
                {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
                {
                  type: TestTokenType.Baz,
                  location: { start: 6, end: 9 },
                },
              ],
              optional: {
                type: TestTokenType.Foo,
                location: { start: 9, end: 12 },
              },
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
              { start: 9, end: 12 },
            ],
          },
        },
      },
      {
        label: 'optional field absent',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              single: {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              pair: [
                {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
                {
                  type: TestTokenType.Baz,
                  location: { start: 6, end: 9 },
                },
              ],
              optional: null,
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'pair field incomplete',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Baz'),
            location: { start: 6, end: 6 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('struct with null field names', () => {
    type TestMatcherResult = { content: Token<TestTokenType.Bar> };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        struct(
          field(null, token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          field('content', token<TestTokenType, TestTokenType.Bar>(_.Bar)),
          field(null, token<TestTokenType, TestTokenType.Baz>(_.Baz)),
        ),
    );

    it.each([
      {
        label: 'struct with null field names',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              content: {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'struct with null fields missing',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Baz'),
            location: { start: 6, end: 6 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('nested structs', () => {
    type InnerStruct = { value: Token<TestTokenType.Bar> };
    type TestMatcherResult = { inner: InnerStruct };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        struct(
          field(
            'inner',
            struct<TestTokenType, InnerStruct>(
              field('value', token<TestTokenType, TestTokenType.Bar>(_.Bar)),
            ),
          ),
        ),
    );

    it.each([
      {
        label: 'nested struct success',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              inner: {
                value: {
                  type: TestTokenType.Bar,
                  location: { start: 0, end: 3 },
                },
              },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'nested struct failure',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
