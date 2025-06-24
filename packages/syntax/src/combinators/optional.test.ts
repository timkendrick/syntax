import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(optional, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
    },
    rules: (_) => ({}),
  });

  describe('basic optional', () => {
    type TestMatcherResult = Token<TestTokenType.Foo> | null;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
    );

    it.each([
      {
        label: 'rule succeeds',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: TestTokenType.Foo,
              location: { start: 0, end: 3 },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'success followed by unexpected tokens',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 3, end: 6 },
          }),
        },
      },
      {
        label: 'empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: null,
            tokens: [],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('basic optional in sequence', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar>];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
        ),
    );

    it.each([
      {
        label: 'rule fails (returns null)',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('optional with complex rule in sequence', () => {
    type TestMatcherResult = [
      [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>] | null,
      Token<TestTokenType.Baz>,
    ];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          optional(
            sequence(
              token<TestTokenType, TestTokenType.Foo>(_.Foo),
              token<TestTokenType, TestTokenType.Bar>(_.Bar),
            ),
          ),
          token<TestTokenType, TestTokenType.Baz>(_.Baz),
        ),
    );

    it.each([
      {
        label: 'complex rule succeeds',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              [
                {
                  type: TestTokenType.Foo,
                  location: { start: 0, end: 3 },
                },
                {
                  type: TestTokenType.Bar,
                  location: { start: 3, end: 6 },
                },
              ],
              {
                type: TestTokenType.Baz,
                location: { start: 6, end: 9 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'complex rule fails (should return null)',
        matcher: TestMatcher,
        input: 'baz',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              {
                type: TestTokenType.Baz,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('two chained optionals', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar> | null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          optional(token<TestTokenType, TestTokenType.Bar>(_.Bar)),
        ),
    );

    it.each([
      {
        label: 'both optionals succeed',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'first succeeds, second fails',
        matcher: TestMatcher,
        input: 'foobaz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 3, end: 6 },
          }),
        },
      },
      {
        label: 'first fails, second succeeds',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'both fail',
        matcher: TestMatcher,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 0, end: 3 },
          }),
        },
      },
      {
        label: 'empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: [null, null],
            tokens: [],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('three chained optionals', () => {
    type TestMatcherResult = [
      Token<TestTokenType.Foo> | null,
      Token<TestTokenType.Bar> | null,
      Token<TestTokenType.Baz> | null,
    ];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          optional(token<TestTokenType, TestTokenType.Bar>(_.Bar)),
          optional(token<TestTokenType, TestTokenType.Baz>(_.Baz)),
        ),
    );

    it.each([
      {
        label: 'all succeed',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
              {
                type: TestTokenType.Baz,
                location: { start: 6, end: 9 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
              { start: 6, end: 9 },
            ],
          },
        },
      },
      {
        label: 'partial matches (first two)',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
              null,
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'sparse matches (first and third)',
        matcher: TestMatcher,
        input: 'foobaz',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              null,
              {
                type: TestTokenType.Baz,
                location: { start: 3, end: 6 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'only first',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              null,
              null,
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'only middle',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
              null,
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'only last',
        matcher: TestMatcher,
        input: 'baz',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              null,
              {
                type: TestTokenType.Baz,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('optional followed by required', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar>];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
        ),
    );

    it.each([
      {
        label: 'optional succeeds, required succeeds',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              {
                type: TestTokenType.Foo,
                location: { start: 0, end: 3 },
              },
              {
                type: TestTokenType.Bar,
                location: { start: 3, end: 6 },
              },
            ],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'optional fails, required succeeds',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: [
              null,
              {
                type: TestTokenType.Bar,
                location: { start: 0, end: 3 },
              },
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'optional succeeds, required fails',
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
      {
        label: 'both fail',
        matcher: TestMatcher,
        input: 'baz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringMatching(/(Expected token: Foo|Expected token: Bar)/),
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
