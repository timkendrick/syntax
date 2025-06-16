import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode, type Token } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { eof } from './eof.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(eof, () => {
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

  describe('standalone usage', () => {
    type TestMatcherResult = null;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => eof<TestTokenType>(),
    );

    it.each([
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
      {
        label: 'single token input',
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
      {
        label: 'multiple tokens input',
        matcher: TestMatcher,
        input: 'foobar',
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

  describe('sequence usage', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => sequence(token<TestTokenType, TestTokenType.Foo>(_.Foo), eof<TestTokenType>()),
    );

    it.each([
      {
        label: 'token followed by end of input',
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
        label: 'token followed by extra tokens',
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

  describe('eof with optional', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo> | null, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)), eof<TestTokenType>()),
    );

    it.each([
      {
        label: 'optional present followed by eof',
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
        label: 'optional absent, only eof',
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
      {
        label: 'optional present with extra tokens',
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
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('multiple eof in sequence', () => {
    type TestMatcherResult = [null, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) => sequence(eof<TestTokenType>(), eof<TestTokenType>()),
    );

    it.each([
      {
        label: 'multiple eof with empty input',
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
      {
        label: 'multiple eof with tokens',
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

  describe('complex eof scenarios', () => {
    type TestMatcherResult = [Token<TestTokenType.Foo>, Token<TestTokenType.Bar>, null];

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        sequence(
          token<TestTokenType, TestTokenType.Foo>(_.Foo),
          token<TestTokenType, TestTokenType.Bar>(_.Bar),
          eof<TestTokenType>(),
        ),
    );

    it.each([
      {
        label: 'exact sequence with eof',
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
        label: 'sequence with extra tokens',
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
        label: 'incomplete sequence',
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
});
