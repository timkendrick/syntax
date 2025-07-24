import { describe, expect, it } from 'vitest';

import { Parser, ResultType, type Result } from '@timkendrick/syntax';

import LispGrammar, { type LispRootNode } from './lisp.grammar';

describe('Lisp grammar', () => {
  describe('tokenize', () => {
    it.each([
      {
        label: 'empty input',
        input: '',
        expected: {
          type: ResultType.Success,
          value: [],
        },
      },
      {
        label: 'symbol',
        input: 'foo',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.NAME({
              start: 0,
              end: 3,
            }),
          ],
        },
      },
      {
        label: 'number',
        input: '3',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.NAME({
              start: 0,
              end: 1,
            }),
          ],
        },
      },
      {
        label: 'empty list',
        input: '()',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.OPEN_PAREN({ start: 0, end: 1 }),
            LispGrammar.tokens.CLOSE_PAREN({ start: 1, end: 2 }),
          ],
        },
      },
      {
        label: 'non-empty list',
        input: '(1 2 3)',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.OPEN_PAREN({ start: 0, end: 1 }),
            LispGrammar.tokens.NAME({ start: 1, end: 2 }),
            LispGrammar.tokens.WHITESPACE({ start: 2, end: 3 }),
            LispGrammar.tokens.NAME({ start: 3, end: 4 }),
            LispGrammar.tokens.WHITESPACE({ start: 4, end: 5 }),
            LispGrammar.tokens.NAME({ start: 5, end: 6 }),
            LispGrammar.tokens.CLOSE_PAREN({ start: 6, end: 7 }),
          ],
        },
      },
      {
        label: 'multiple statements',
        input: '(1 2 3)\n4',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.OPEN_PAREN({ start: 0, end: 1 }),
            LispGrammar.tokens.NAME({ start: 1, end: 2 }),
            LispGrammar.tokens.WHITESPACE({ start: 2, end: 3 }),
            LispGrammar.tokens.NAME({ start: 3, end: 4 }),
            LispGrammar.tokens.WHITESPACE({ start: 4, end: 5 }),
            LispGrammar.tokens.NAME({ start: 5, end: 6 }),
            LispGrammar.tokens.CLOSE_PAREN({ start: 6, end: 7 }),
            LispGrammar.tokens.NEWLINE({ start: 7, end: 8 }),
            LispGrammar.tokens.NAME({ start: 8, end: 9 }),
          ],
        },
      },
      {
        label: 'multiple statements with whitespace',
        input: '  ( + 1 2 )  \n \n \n 3 \n \n \n',
        expected: {
          type: ResultType.Success,
          value: [
            LispGrammar.tokens.WHITESPACE({ start: 0, end: 2 }),
            LispGrammar.tokens.OPEN_PAREN({ start: 2, end: 3 }),
            LispGrammar.tokens.WHITESPACE({ start: 3, end: 4 }),
            LispGrammar.tokens.NAME({ start: 4, end: 5 }),
            LispGrammar.tokens.WHITESPACE({ start: 5, end: 6 }),
            LispGrammar.tokens.NAME({ start: 6, end: 7 }),
            LispGrammar.tokens.WHITESPACE({ start: 7, end: 8 }),
            LispGrammar.tokens.NAME({ start: 8, end: 9 }),
            LispGrammar.tokens.WHITESPACE({ start: 9, end: 10 }),
            LispGrammar.tokens.CLOSE_PAREN({ start: 10, end: 11 }),
            LispGrammar.tokens.WHITESPACE({ start: 11, end: 13 }),
            LispGrammar.tokens.NEWLINE({ start: 13, end: 14 }),
            LispGrammar.tokens.WHITESPACE({ start: 14, end: 15 }),
            LispGrammar.tokens.NEWLINE({ start: 15, end: 16 }),
            LispGrammar.tokens.WHITESPACE({ start: 16, end: 17 }),
            LispGrammar.tokens.NEWLINE({ start: 17, end: 18 }),
            LispGrammar.tokens.WHITESPACE({ start: 18, end: 19 }),
            LispGrammar.tokens.NAME({ start: 19, end: 20 }),
            LispGrammar.tokens.WHITESPACE({ start: 20, end: 21 }),
            LispGrammar.tokens.NEWLINE({ start: 21, end: 22 }),
            LispGrammar.tokens.WHITESPACE({ start: 22, end: 23 }),
            LispGrammar.tokens.NEWLINE({ start: 23, end: 24 }),
            LispGrammar.tokens.WHITESPACE({ start: 24, end: 25 }),
            LispGrammar.tokens.NEWLINE({ start: 25, end: 26 }),
          ],
        },
      },
    ])('$label: $input', ({ input, expected }) => {
      const parser = new Parser(LispGrammar.grammar);
      const actual = parser.tokenize(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('parse', () => {
    it.each([
      {
        label: 'number',
        input: '3',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.Symbol(
                  {
                    value: '3',
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'empty list',
        input: '()',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.List(
                  {
                    items: [],
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'function application',
        input: '(+ 1 2)',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.List(
                  {
                    items: [
                      LispGrammar.nodes.Symbol(
                        {
                          value: '+',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '1',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '2',
                        },
                        expect.any(Array),
                      ),
                    ],
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'function application with whitespace',
        input: '  ( + 1 2 )  ',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.List(
                  {
                    items: [
                      LispGrammar.nodes.Symbol(
                        {
                          value: '+',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '1',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '2',
                        },
                        expect.any(Array),
                      ),
                    ],
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'multiple statements',
        input: '(+ 1 2)\n3',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.List(
                  {
                    items: [
                      LispGrammar.nodes.Symbol(
                        {
                          value: '+',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '1',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '2',
                        },
                        expect.any(Array),
                      ),
                    ],
                  },
                  expect.any(Array),
                ),
                LispGrammar.nodes.Symbol(
                  {
                    value: '3',
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'multiple statements with leading/trailing whitespace',
        input: '  (+ 1 2)  \n \n \n 3 \n \n \n',
        expected: {
          type: ResultType.Success,
          value: LispGrammar.nodes.Program(
            {
              statements: [
                LispGrammar.nodes.List(
                  {
                    items: [
                      LispGrammar.nodes.Symbol(
                        {
                          value: '+',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '1',
                        },
                        expect.any(Array),
                      ),
                      LispGrammar.nodes.Symbol(
                        {
                          value: '2',
                        },
                        expect.any(Array),
                      ),
                    ],
                  },
                  expect.any(Array),
                ),
                LispGrammar.nodes.Symbol(
                  {
                    value: '3',
                  },
                  expect.any(Array),
                ),
              ],
            },
            expect.any(Array),
          ),
        } as Result<LispRootNode, Error>,
      },
      {
        label: 'invalid input',
        input: '1 2 3',
        expected: {
          type: ResultType.Error,
          error: expect.objectContaining({
            message: expect.stringContaining('Expected end of input'),
            location: expect.objectContaining({ start: 2, end: 3 }),
          }),
        } as Result<LispRootNode, Error>,
      },
    ])(
      '$label: $input',
      ({ input, expected }: { input: string; expected: Result<LispRootNode, Error> }) => {
        if (expected.type === ResultType.Error) {
          expect(() => LispGrammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = LispGrammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      },
    );
  });
});
