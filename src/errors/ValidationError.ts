import { FieldError } from '../types';

/**
 * Custom error class for validation failures.
 * It provides structured access to field-specific errors.
 */
export class ValidationError extends Error {
  public fields: FieldError[];
  /**
   * Optionally store the original error (e.g., ZodError) for debugging
   */
  public originalError?: unknown;

  /**
   * Creates an instance of ValidationError.
   * @param fields An array of FieldError objects.
   * @param originalError The original error object from the validator (optional).
   * @param message A custom error message (optional). If not provided, a default message is generated.
   */
  constructor(fields: FieldError[], originalError?: unknown, message?: string) {
    const defaultMessage =
      fields.map((f) => `${f.path}: ${f.message}`).join(', ') ||
      'Validation failed.';
    super(message || defaultMessage);
    this.name = 'ValidationError';
    this.fields = fields;
    this.originalError = originalError;

    // Capture the stack trace for better debugging in Node.js environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}
