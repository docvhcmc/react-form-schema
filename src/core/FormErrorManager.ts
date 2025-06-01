import { IFormErrorManager } from '../interfaces/IFormErrorManager';
import { FieldError } from '../types';

/**
 * Manages validation errors for a form.
 */
export class FormErrorManager implements IFormErrorManager {
  private _errors: FieldError[] = [];

  constructor(initialErrors: FieldError[] = []) {
    this._errors = initialErrors;
  }

  /**
   * Sets all errors at once, replacing any existing errors.
   * @param errors An array of FieldError objects.
   */
  public setErrors(errors: FieldError[]): void {
    this._errors = errors;
  }

  /**
   * Adds a single error to the current list of errors.
   * @param error The FieldError object to add.
   */
  public addError(error: FieldError): void {
    this._errors.push(error);
  }

  /**
   * Checks if any error exists for a specific field path, or if any error exists in general.
   * @param path Optional. The dot-notation path of the field (e.g., 'name', 'address.street').
   * @returns `true` if an error exists for the specified path or if any error exists, `false` otherwise.
   */
  public hasError(path?: string): boolean {
    if (!path) {
      return this._errors.length > 0;
    }
    return this._errors.some((error) => error.path === path);
  }

  /**
   * Retrieves the first error message for a specific field.
   * @param path The dot-notation path of the field.
   * @returns The error message string, or `undefined` if the field has no error.
   */
  public getFirstFieldError(path: string): string | undefined {
    return this._errors.find((error) => error.path === path)?.message;
  }

  /**
   * Retrieves all error objects for a specific field.
   * @param path The dot-notation path of the field.
   * @returns An array of `FieldError` objects for the specified field.
   */
  public getErrorsForField(path: string): FieldError[] {
    return this._errors.filter((error) => error.path === path);
  }

  /**
   * Retrieves all current error objects.
   * @returns An array of all `FieldError` objects.
   */
  public getAllErrors(): FieldError[] {
    // Return a shallow copy to prevent direct mutation of the internal errors array.
    return [...this._errors];
  }

  /**
   * Clears all existing errors.
   */
  public clearErrors(): void {
    this._errors = [];
  }
}
