import { z } from 'zod';
import { ValidationCode } from '../../constants';
import { ValidationError } from '../../errors';

/**
 * Helper method to build a consistent ValidationError object from a ZodError or other unknown errors.
 * @param e The error caught (can be ZodError or any other error).
 * @param field Optional. The name of the field primarily associated with the error, if applicable.
 * @returns A ValidationError instance.
 */
export function buildValidationError(
  e: unknown,
  field?: string,
  debug?: boolean
): ValidationError {
  if (debug) {
    console.log('buildValidationError called for:', e, 'field:', field);
  }
  if (e instanceof z.ZodError) {
    return new ValidationError(
      e.issues.map((issue) => {
        const { path, code, message, ...params } = issue;
        const origin =
          'origin' in issue && typeof issue.origin === 'string'
            ? issue.origin
            : undefined;
        const combinedCode = origin
          ? [origin, code || ''].filter((a) => !!a).join('.')
          : code || '';
        return {
          path: (path || []).join('.'), // Ensure path is a string for FieldError
          code: combinedCode,
          message,
          origin,
          params,
        };
      }),
      e
    );
  }
  // Handle generic errors or errors without a specific ZodError structure
  const errorMessage = e instanceof Error ? e.message : String(e);
  if (field) {
    return new ValidationError(
      [
        {
          path: field,
          code: ValidationCode.UNEXPECTED, // Use a generic code for unexpected errors
          message: errorMessage || 'An unexpected error occurred.',
        },
      ],
      e
    );
  }
  return new ValidationError(
    [
      {
        path: '', // General form-level error
        code: ValidationCode.UNEXPECTED,
        message:
          errorMessage || 'An unexpected error occurred during validation.',
      },
    ],
    e
  );
}
