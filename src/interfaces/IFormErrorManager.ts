import { FieldError } from '../types';

/**
 * Interface for the FormErrorManager, responsible for handling validation errors.
 */
export interface IFormErrorManager {
  /**
   * Sets all errors at once, replacing any existing errors.
   * @param errors An array of FieldError objects.
   */
  setErrors(errors: FieldError[]): void;
  /**
   * Adds a single error to the current list of errors.
   * @param error The FieldError object to add.
   */
  addError(error: FieldError): void;
  /**
   * Checks if any error exists for a specific field path, or if any error exists in general.
   * @param path Optional. The dot-notation path of the field (e.g., 'name', 'address.street').
   * @returns `true` if an error exists for the specified path or if any error exists, `false` otherwise.
   */
  hasError(path?: string): boolean;
  /**
   * Retrieves the first error message for a specific field.
   * @param path The dot-notation path of the field.
   * @returns The error message string, or `undefined` if the field has no error.
   */
  getFirstFieldError(path: string): string | undefined;
  /**
   * Retrieves all error objects for a specific field.
   * @param path The dot-notation path of the field.
   * @returns An array of `FieldError` objects for the specified field.
   */
  getErrorsForField(path: string): FieldError[];
  /**
   * Retrieves all current error objects.
   * @returns An array of all `FieldError` objects.
   */
  getAllErrors(): FieldError[];
  /**
   * Clears all existing errors.
   */
  clearErrors(): void;
}
