import { describe, expect, it } from 'vitest';

import { Parser, ResultType, type Result } from '@timkendrick/syntax';

import LambdaCalculusGrammar, { type LambdaCalculusRootNode } from './lambda-calculus.grammar.ts';

describe('Lambda Calculus grammar', () => {
  describe('tokenize', () => {
    it.each([
      {
        label: 'variable',
        input: 'x',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.VARIABLE({
              start: 0,
              end: 1,
            }),
          ],
        },
      },
      {
        label: 'lambda symbol',
        input: 'λ',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.LAMBDA({
              start: 0,
              end: 1,
            }),
          ],
        },
      },
      {
        label: 'backslash lambda',
        input: '\\',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.LAMBDA({
              start: 0,
              end: 1,
            }),
          ],
        },
      },
      {
        label: 'lambda expression',
        input: 'λx.x',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.LAMBDA({ start: 0, end: 1 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 1, end: 2 }),
            LambdaCalculusGrammar.tokens.DOT({ start: 2, end: 3 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 3, end: 4 }),
          ],
        },
      },
      {
        label: 'application',
        input: '(f x)',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.OPEN_PAREN({ start: 0, end: 1 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 1, end: 2 }),
            LambdaCalculusGrammar.tokens.WHITESPACE({ start: 2, end: 3 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 3, end: 4 }),
            LambdaCalculusGrammar.tokens.CLOSE_PAREN({ start: 4, end: 5 }),
          ],
        },
      },
      {
        label: 'parentheses',
        input: '(x)',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.OPEN_PAREN({ start: 0, end: 1 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 1, end: 2 }),
            LambdaCalculusGrammar.tokens.CLOSE_PAREN({ start: 2, end: 3 }),
          ],
        },
      },
      {
        label: 'complex expression with whitespace',
        input: '  λf.λx.f x  ',
        expected: {
          type: ResultType.Success,
          value: [
            LambdaCalculusGrammar.tokens.WHITESPACE({ start: 0, end: 2 }),
            LambdaCalculusGrammar.tokens.LAMBDA({ start: 2, end: 3 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 3, end: 4 }),
            LambdaCalculusGrammar.tokens.DOT({ start: 4, end: 5 }),
            LambdaCalculusGrammar.tokens.LAMBDA({ start: 5, end: 6 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 6, end: 7 }),
            LambdaCalculusGrammar.tokens.DOT({ start: 7, end: 8 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 8, end: 9 }),
            LambdaCalculusGrammar.tokens.WHITESPACE({ start: 9, end: 10 }),
            LambdaCalculusGrammar.tokens.VARIABLE({ start: 10, end: 11 }),
            LambdaCalculusGrammar.tokens.WHITESPACE({ start: 11, end: 13 }),
          ],
        },
      },
    ])('$label: $input', ({ input, expected }) => {
      const parser = new Parser(LambdaCalculusGrammar.grammar);
      const actual = parser.tokenize(input);
      expect(actual).toEqual(expected);
    });
  });

  describe('parse', () => {
    it.each([
      {
        label: 'variable',
        input: 'x',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Variable(
                {
                  name: 'x',
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'identity function',
        input: 'λx.x',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Lambda(
                {
                  parameter: 'x',
                  body: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'x',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'identity function with backslash',
        input: '\\x.x',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Lambda(
                {
                  parameter: 'x',
                  body: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'x',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'simple application',
        input: '(f x)',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Application(
                {
                  function: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'f',
                    },
                    expect.any(Array),
                  ),
                  argument: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'x',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'multiple arguments (curried)',
        input: '((f x) y)',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Application(
                {
                  function: LambdaCalculusGrammar.nodes.Application(
                    {
                      function: LambdaCalculusGrammar.nodes.Variable(
                        {
                          name: 'f',
                        },
                        expect.any(Array),
                      ),
                      argument: LambdaCalculusGrammar.nodes.Variable(
                        {
                          name: 'x',
                        },
                        expect.any(Array),
                      ),
                    },
                    expect.any(Array),
                  ),
                  argument: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'y',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'application with lambda function',
        input: '(λx.x y)',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Application(
                {
                  function: LambdaCalculusGrammar.nodes.Lambda(
                    {
                      parameter: 'x',
                      body: LambdaCalculusGrammar.nodes.Variable(
                        {
                          name: 'x',
                        },
                        expect.any(Array),
                      ),
                    },
                    expect.any(Array),
                  ),
                  argument: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'y',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'nested application',
        input: '(((f x) y) z)',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Application(
                {
                  function: LambdaCalculusGrammar.nodes.Application(
                    {
                      function: LambdaCalculusGrammar.nodes.Application(
                        {
                          function: LambdaCalculusGrammar.nodes.Variable(
                            {
                              name: 'f',
                            },
                            expect.any(Array),
                          ),
                          argument: LambdaCalculusGrammar.nodes.Variable(
                            {
                              name: 'x',
                            },
                            expect.any(Array),
                          ),
                        },
                        expect.any(Array),
                      ),
                      argument: LambdaCalculusGrammar.nodes.Variable(
                        {
                          name: 'y',
                        },
                        expect.any(Array),
                      ),
                    },
                    expect.any(Array),
                  ),
                  argument: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'z',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'curried function',
        input: 'λf.λx.(f x)',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Lambda(
                {
                  parameter: 'f',
                  body: LambdaCalculusGrammar.nodes.Lambda(
                    {
                      parameter: 'x',
                      body: LambdaCalculusGrammar.nodes.Application(
                        {
                          function: LambdaCalculusGrammar.nodes.Variable(
                            {
                              name: 'f',
                            },
                            expect.any(Array),
                          ),
                          argument: LambdaCalculusGrammar.nodes.Variable(
                            {
                              name: 'x',
                            },
                            expect.any(Array),
                          ),
                        },
                        expect.any(Array),
                      ),
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
      {
        label: 'expression with whitespace',
        input: '  λx.x  ',
        expected: {
          type: ResultType.Success,
          value: LambdaCalculusGrammar.nodes.Expression(
            {
              expression: LambdaCalculusGrammar.nodes.Lambda(
                {
                  parameter: 'x',
                  body: LambdaCalculusGrammar.nodes.Variable(
                    {
                      name: 'x',
                    },
                    expect.any(Array),
                  ),
                },
                expect.any(Array),
              ),
            },
            expect.any(Array),
          ),
        } as Result<LambdaCalculusRootNode, Error>,
      },
    ])(
      '$label: $input',
      ({ input, expected }: { input: string; expected: Result<LambdaCalculusRootNode, Error> }) => {
        if (expected.type === ResultType.Error) {
          expect(() => LambdaCalculusGrammar.parse(input)).toThrow(expected.error);
        } else {
          const actual = LambdaCalculusGrammar.parse(input);
          expect(actual).toEqual(expected.value);
        }
      },
    );
  });
});
