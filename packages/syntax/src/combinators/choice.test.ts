import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { choice } from './choice.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(choice, () => {
  enum TestTokenType {
    Foo = 'Foo',
    Bar = 'Bar',
    Baz = 'Baz',
    Qux = 'Qux',
  }

  const TestGrammar = createGrammar<TestTokenType, AnyAstNode, object>({
    tokens: {
      [TestTokenType.Foo]: 'foo',
      [TestTokenType.Bar]: 'bar',
      [TestTokenType.Baz]: 'baz',
      [TestTokenType.Qux]: 'qux',
    },
    rules: (_) => ({}),
  });

  describe('2-option choice', () => {
    type TestMatcherResult = Token<TestTokenType.Foo> | Token<TestTokenType.Bar>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
        ),
    );

    it.each([
      {
        label: 'first option succeeds',
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
        label: 'second option succeeds',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: TestTokenType.Bar,
              location: { start: 0, end: 3 },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'both options succeed (should use first match)',
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
        label: 'both options fail',
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
      {
        label: 'success followed by unexpected tokens',
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
        label: 'empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 0, end: 0 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('3-option choice', () => {
    type TestMatcherResult =
      | Token<TestTokenType.Foo>
      | Token<TestTokenType.Bar>
      | Token<TestTokenType.Baz>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
          token<TestTokenType, TestTokenType.Baz>(_.Baz),
        ),
    );

    it.each([
      {
        label: 'first option succeeds',
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
        label: 'second option succeeds',
        matcher: TestMatcher,
        input: 'bar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: TestTokenType.Bar,
              location: { start: 0, end: 3 },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'third option succeeds',
        matcher: TestMatcher,
        input: 'baz',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              type: TestTokenType.Baz,
              location: { start: 0, end: 3 },
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'all options fail',
        matcher: TestMatcher,
        input: 'qux',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringMatching(
              /(Expected token: Foo|Expected token: Bar|Expected token: Baz)/,
            ),
            location: { start: 0, end: 3 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('single-option choice', () => {
    type TestMatcherResult = Token<TestTokenType.Foo>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => choice(token<TestTokenType, TestTokenType.Foo>(_.Foo)),
    );

    it.each([
      {
        label: 'single option succeeds',
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
        label: 'single option fails',
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

  describe('error precedence', () => {
    type TestMatcherResult =
      | [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar>, Token<TestTokenType.Baz>]
      | [Token<TestTokenType.Bar>, Token<TestTokenType.Bar>, Token<TestTokenType.Qux>];

    const TestMatcher1: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice<
          TestTokenType,
          [
            [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar>, Token<TestTokenType.Baz>],
            [Token<TestTokenType.Bar>, Token<TestTokenType.Bar>, Token<TestTokenType.Qux>],
          ]
        >(
          sequence(optional(token(_.Foo)), token(_.Bar), token(_.Baz)),
          sequence(token(_.Bar), token(_.Bar), token(_.Qux)),
        ),
    );

    const TestMatcher2: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        choice<
          TestTokenType,
          [
            [Token<TestTokenType.Bar>, Token<TestTokenType.Bar>, Token<TestTokenType.Qux>],
            [Token<TestTokenType.Foo> | null, Token<TestTokenType.Bar>, Token<TestTokenType.Baz>],
          ]
        >(
          sequence(token(_.Bar), token(_.Bar), token(_.Qux)),
          sequence(optional(token(_.Foo)), token(_.Bar), token(_.Baz)),
        ),
    );

    it.each([
      {
        label: 'returns error from rule that advanced furthest',
        matcher: TestMatcher1,
        input: 'barbarbazqux',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Qux'),
            location: { start: 6, end: 9 },
          }),
        },
      },
      {
        label: 'returns error from rule that advanced furthest (inverted order)',
        matcher: TestMatcher2,
        input: 'barbarbazqux',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Qux'),
            location: { start: 6, end: 9 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
