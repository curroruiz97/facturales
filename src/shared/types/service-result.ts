export interface ServiceError {
  message: string;
  code?: string;
  cause?: unknown;
}

export type ServiceResult<T> =
  | { success: true; data: T }
  | { success: false; error: ServiceError };

export function ok<T>(data: T): ServiceResult<T> {
  return { success: true, data };
}

export function fail(message: string, code?: string, cause?: unknown): ServiceResult<never> {
  return { success: false, error: { message, code, cause } };
}
