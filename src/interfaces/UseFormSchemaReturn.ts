import { FieldError, SchemaInput } from '../types';
import { IFormErrorManager } from './IFormErrorManager';

/**
 * Interface defining the structure of the object returned by the `useFormSchema` hook.
 * @template O - Represents the inferred output type of the schema.
 */
export interface UseFormSchemaReturn<O> {
  // === Form State ===
  /**
   * The current raw (unvalidated and untransformed) input values of the form.
   */
  rawInput: SchemaInput<O>;
  /**
   * Indicates whether the entire form is currently valid (has no validation errors).
   */
  isValid: boolean;

  // === Error Management ===
  /**
   * An object providing comprehensive error management utilities.
   * It includes methods like `hasError`, `getFirstFieldError`, `getErrorsForField`, `getAllErrors`, and `clearErrors`.
   */
  errors: {
    /**
     * Checks if any error exists for a specific field path, or if any error exists in general.
     * @param path Optional. The dot-notation path of the field.
     */
    hasError: IFormErrorManager['hasError'];
    /**
     * Retrieves the first error message for a specific field.
     * @param path The dot-notation path of the field.
     */
    getFirstFieldError: IFormErrorManager['getFirstFieldError'];
    /**
     * Retrieves all error objects for a specific field.
     * @param path The dot-notation path of the field.
     */
    getErrorsForField: IFormErrorManager['getErrorsForField'];
    /**
     * Retrieves all current error objects.
     */
    getAllErrors: IFormErrorManager['getAllErrors'];
    /**
     * Clears all existing errors.
     */
    clearErrors: IFormErrorManager['clearErrors'];
  };

  // === Change Handlers ===
  handleChange: (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => void;

  // === Submission Handlers ===
  /**
   * A higher-order function that returns an `onSubmit` handler for HTML forms.
   * It performs full form validation and calls either `onSubmitValid` or `onSubmitInvalid` based on the validation result.
   * @param onSubmitValid A callback function executed when the form is valid and submitted. Receives the parsed and validated data.
   * @param onSubmitInvalid An optional callback function executed when the form is invalid. Receives an array of `FieldError` objects.
   * @returns An event handler function suitable for the `onSubmit` prop of a `<form>` element.
   */
  handleSubmit: (
    onSubmitValid: (data: O) => void,
    onSubmitInvalid?: (errors: FieldError[]) => void
  ) => (event: React.FormEvent) => void;

  // === Form Actions ===
  /**
   * Resets the form's internal raw input state to its initial state or an empty state.
   * This clears current values and errors.
   * @param initialValues Optional. New initial values to reset the form to. If not provided, resets to empty.
   */
  reset: (initialValues?: SchemaInput<O>) => void;
  /**
   * Returns a memoized setter function for a specific form field.
   * This setter updates the form's internal raw input state and triggers field-specific validation.
   * @param field The name of the field for which to create a setter.
   * @returns A function that takes a value (of Input type) and updates the corresponding field.
   */
  setValueFor: <F extends keyof O>(
    field: F
  ) => (value: SchemaInput<O>[F]) => void;
  /**
   * Overwrites the entire raw input state of the form with the new values.
   * Triggers a full form validation.
   * @param newValues The new raw input values to set.
   */
  /**
   * Overwrites the entire raw input state of the form with the new values.
   * Triggers a full form validation.
   * @param newValues The new raw input values to set.
   */
  setRawValue: (newValues: SchemaInput<O>) => void;
  /**
   * Merges the provided partial values into the existing raw input state.
   * Existing fields not present in `partialValues` will be retained. Triggers a full form validation.
   * @param partialValues The partial raw input values to merge.
   */
  mergeRawValue: (partialValues: SchemaInput<O>) => void;
  /**
   * Manually triggers validation for the entire form or a specific field.
   * Updates the internal error state and notifies subscribers.
   * @param field Optional. The name of the field to validate, or a partial input object for external validation.
   * @param value Optional. The value for a specific field when `field` is a field name.
   * @returns A Promise that resolves to `undefined` if validation passes, or an `Error` instance if validation fails.
   */
  validate: (
    field?: keyof O | SchemaInput<O>,
    value?: SchemaInput<O>[keyof O]
  ) => Promise<undefined | Error>;
}
