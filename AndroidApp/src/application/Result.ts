export type Result<T, E = AppError> = Ok<T> | Err<E>

export interface Ok<T> {
  success: true
  data: T
}

export interface Err<E> {
  success: false
  error: E
}

export function ok<T>(data: T): Ok<T> {
  return { success: true, data }
}

export function err<E>(error: E): Err<E> {
  return { success: false, error }
}

export interface AppError {
  code: string
  message: string
  details?: unknown
}

export function appError(code: string, message: string, details?: unknown): AppError {
  return { code, message, details }
}
