import { describe, expect, it } from 'vitest';

import { createGrammar, type AnyAstNode } from '../grammar.ts';
import { createPatternMatcher, type PatternMatcher } from '../parser.ts';
import { ResultType } from '../result.ts';

import { map } from './map.ts';
import { optional } from './optional.ts';
import { sequence } from './sequence.ts';
import { token } from './token.ts';

describe(map, () => {
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

  describe('basic map transformations', () => {
    type TestMatcherResult = string;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        map(token<TestTokenType, TestTokenType.Foo>(_.Foo), (value) => `transformed_${value.type}`),
    );

    it.each([
      {
        label: 'successful transformation',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'transformed_Foo',
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'transformation with failure',
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

  describe('map with sequence', () => {
    type TestMatcherResult = { first: string; second: string };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        map(
          sequence(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Bar>(_.Bar),
          ),
          ([fooToken, barToken]) => ({
            first: fooToken.type,
            second: barToken.type,
          }),
        ),
    );

    it.each([
      {
        label: 'successful sequence transformation',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              first: 'Foo',
              second: 'Bar',
            },
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
      {
        label: 'sequence transformation with failure',
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

  describe('map with optional', () => {
    type TestMatcherResult = { hasValue: boolean; value?: string };

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        map(optional(token<TestTokenType, TestTokenType.Foo>(_.Foo)), (value) => ({
          hasValue: value !== null,
          value: value?.type,
        })),
    );

    it.each([
      {
        label: 'optional present transformation',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              hasValue: true,
              value: 'Foo',
            },
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
      {
        label: 'optional absent transformation',
        matcher: TestMatcher,
        input: '',
        expected: {
          type: ResultType.Success,
          value: {
            match: {
              hasValue: false,
              value: undefined,
            },
            tokens: [],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('nested map transformations', () => {
    type TestMatcherResult = string;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        map(
          map(token<TestTokenType, TestTokenType.Foo>(_.Foo), (value) => `inner_${value.type}`),
          (value) => `outer_${value}`,
        ),
    );

    it.each([
      {
        label: 'nested transformations',
        matcher: TestMatcher,
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: {
            match: 'outer_inner_Foo',
            tokens: [{ start: 0, end: 3 }],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('map with array transformations', () => {
    type TestMatcherResult = Array<string>;

    const TestMatcher: PatternMatcher<TestMatcherResult> = createPatternMatcher(
      TestGrammar,
      (_) => ($) =>
        map(
          sequence(
            token<TestTokenType, TestTokenType.Foo>(_.Foo),
            token<TestTokenType, TestTokenType.Bar>(_.Bar),
          ),
          ([fooToken, barToken]) => [fooToken.type, barToken.type],
        ),
    );

    it.each([
      {
        label: 'array transformation',
        matcher: TestMatcher,
        input: 'foobar',
        expected: {
          type: ResultType.Success,
          value: {
            match: ['Foo', 'Bar'],
            tokens: [
              { start: 0, end: 3 },
              { start: 3, end: 6 },
            ],
          },
        },
      },
    ])('$label: $input', ({ matcher, input, expected }) => {
      const actual = matcher(input);
      expect(actual).toEqual(expected);
    });
  });
});
