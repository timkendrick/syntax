import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(sequence, () => {
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

  describe('basic sequence', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => sequence(token(_.Foo), token(_.Bar)),
    );

    it.each([
      {
        label: 'successful 2-item sequence',
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
        label: 'failure at first element',
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
        label: 'failure at second element',
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
        label: 'unexpected trailing tokens',
        matcher: TestMatcher,
        input: 'foobarbaz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: { start: 6, end: 9 },
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

  describe('sequence with optional elements', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, Token<TestTokenType.Bar> | null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          optional(token<TestTokenType, TestTokenType.Bar>(_.Bar)),
        ),
    );

    it.each([
      {
        label: 'required and optional both present',
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
        label: 'required present, optional absent',
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
            ],
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'required absent',
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

  describe('3-element sequence', () => {
    type TestMatcherResult = [
      Token<TestTokenType.Foo>,
      Token<TestTokenType.Bar>,
      Token<TestTokenType.Foo>,
    ];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => sequence(token(_.Foo), token(_.Bar), token(_.Foo)),
    );

    it.each([
      {
        label: 'successful 3-item sequence',
        matcher: TestMatcher,
        input: 'foobarfoo',
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
                type: TestTokenType.Foo,
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
        label: 'failure at second element',
        matcher: TestMatcher,
        input: 'foofoo',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 3, end: 6 },
          }),
        },
      },
      {
        label: 'failure at third element',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Foo'),
            location: { start: 6, end: 6 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('nested sequences', () => {
    type TestMatcherResult = [
      [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>],
      Token<TestTokenType.Baz>,
    ];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          sequence(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Bar>(_.Bar),
          ),
          token<TestTokenType, TestTokenType.Baz>(_.Baz),
        ),
    );

    it.each([
      {
        label: 'successful nested sequence',
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
        label: 'nested sequence fails',
        matcher: TestMatcher,
        input: 'foobaz',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected token: Bar'),
            location: { start: 3, end: 6 },
          }),
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('empty sequence', () => {
    type TestMatcherResult = [];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => sequence(),
    );

    it.each([
      {
        label: 'empty sequence with empty input',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: [],
            tokens: [],
          },
        },
      },
      {
        label: 'empty sequence with non-empty input',
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

  describe('sequence with mixed types', () => {
    type TestMatcherResult = [
      Token<TestTokenType.Foo>,
      Token<TestTokenType.Bar> | null,
      Token<TestTokenType.Baz>,
    ];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          optional(token<TestTokenType, TestTokenType.Bar>(_.Bar)),
          token<TestTokenType, TestTokenType.Baz>(_.Baz),
        ),
    );

    it.each([
      {
        label: 'all elements present',
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
        label: 'optional element missing',
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
        label: 'required element missing',
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
});
