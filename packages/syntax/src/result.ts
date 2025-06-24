export enum ResultType {
  Success = 'success',
  Error = 'error',
}

/**
 * Represents the result of an operation that can either succeed or fail.
 *
 * @template T The type of the success value
 * @template E The type of the error value
 */
export type Result<T, E> = SuccessResult<T> | ErrorResult<E>;

export interface SuccessResult<T> {
  type: ResultType.Success;
  /**
   * The result of the successful operation.
   */
  value: T;
}

export interface ErrorResult<E> {
  type: ResultType.Error;
  /**
   * The error that occurred during the operation.
   */
  error: E;
}
