import { NonEmptyArray, SchemaInput } from '../types';
import { IFormErrorManager } from './IFormErrorManager';

/**
 * Interface for the core FormSchema class, defining its essential methods and properties. 
 * @template O - Represents the inferred output type of the schema.
 */
export interface IFormSchema<O> {
  // === Public Properties ===
  /**
   * An instance of `IFormErrorManager` for comprehensive error handling and queries.
   */
  readonly errors: IFormErrorManager;
  /**
   * Indicates whether the entire form is currently valid (has no validation errors).
   */
  readonly isValid: boolean;

  // === Subscription Methods ===
  /**
   * Subscribes a callback function to listen for changes in the form's state (input values or errors).
   * @param callback The function to call when the form state changes.
   */
  subscribe(callback: () => void): void;
  /**
   * Unsubscribes a callback function that was previously registered.
   * @param callback The function to remove from the subscriber list.
   */
  unsubscribe(callback: () => void): void;

  // === Value Accessors ===
  /**
   * Retrieves the current raw (unvalidated and untransformed) input value(s) from the form.
   * Overload 1: Retrieves the entire raw input object.
   */
  getRawValue(): SchemaInput<O>;
  /**
   * Retrieves the raw (unvalidated and untransformed) input value for a specific field.
   * Overload 2: Retrieves the raw input value for a specified field.
   * @param field The name of the specific field to retrieve.
   */
  getRawValue<F extends keyof O>(field: F): SchemaInput<O>[F] | undefined;

  /**
   * Retrieves the parsed and validated value(s) from the form's internal state using the schema.
   * This method performs asynchronous validation and transformation.
   * It throws a `ValidationError` if validation fails.
   * Overload 1: Retrieves the entire parsed and validated form data.
   */
  getValidatedValue(): Promise<O>;
  /**
   * Retrieves a specific field's parsed and validated value from the form's internal state.
   * Overload 2: Retrieves a specific field's parsed and validated value.
   * @param field The name of the specific field to retrieve.
   */
  getValidatedValue<F extends keyof O>(field: F): Promise<O[F]>;

  // === Data Manipulation Methods ===
  /**
   * Parses and validates an external data object or FormData against the entire schema.
   * This method performs asynchronous validation and transformation.
   * It throws a `ValidationError` if validation fails.
   * @param data The external data object or FormData to parse.
   * @returns A promise that resolves to the parsed and validated data.
   */
  parse(data: SchemaInput<O> | FormData): Promise<O>;

  /**
   * Applies a custom refinement rule to the entire schema.
   * This allows for cross-field validation or complex asynchronous checks.
   * @param check The asynchronous or synchronous function to validate the parsed data.
   * @param message The error message details (code, path, params) if validation fails.
   * @returns The current `FormSchema` instance for chaining.
   */
  applyRule(
    check: (data: O) => boolean | Promise<boolean>,
    message: {
      code: string;
      path: keyof O | NonEmptyArray<keyof O>;
      params?: {
        [k: string]: any;
      };
    }
  ): this;

  /**
   * Overwrites the entire raw input state of the form with the new values.
   * This is useful for completely replacing the form's data, e.g., when loading
   * a new record from an API or clearing the form. It also triggers a full form validation.
   * @param newValues The new raw input values to set.
   */
  setRawValue(newValues: SchemaInput<O>): void;
  /**
   * Merges the provided partial values into the existing raw input state.
   * Existing fields not present in `partialValues` will be retained.
   * This is useful for applying incremental updates to the form's data. It also triggers a full form validation.
   * @param partialValues The partial raw input values to merge.
   */
  mergeRawValue(partialValues: SchemaInput<O>): void;

  /**
   * Returns a memoized setter function for a specific form field.
   * This setter updates the form's internal raw input state and triggers field-specific validation.
   * @param field The name of the field for which to create a setter.
   * @returns A function that takes a value (of Input type) and updates the corresponding field.
   */
  setValueFor<F extends keyof O>(field: F): (value: SchemaInput<O>[F]) => void;

  /**
   * Resets the form's internal raw input state to its initial state or an empty state.
   * This effectively overwrites the current state and clears all errors.
   * @param initialValues Optional. New initial values to reset the form to. If not provided, resets to empty.
   */
  reset(initialValues?: SchemaInput<O>): void;

  // === Validation Methods ===
  /**
   * Validates the form's current internal input data or external data.
   * This method performs asynchronous validation but does NOT throw errors for validation failures.
   * It updates the internal error state and notifies subscribers.
   * Overload 1: Validates the entire internal `_rawInput`.
   * @returns A Promise that resolves to `undefined` if validation passes, or an `Error` instance if validation fails.
   */
  validate(): Promise<undefined | Error>;
  /**
   * Validates a specific field from the form's current internal input data.
   * Overload 2: Validates a specific field from the internal `_rawInput`.
   * @param field The name of the field to validate.
   * @returns A Promise that resolves to `undefined` if validation passes, or an `Error` instance if validation fails.
   */
  validate<F extends keyof O>(field: F): Promise<undefined | Error>;
  /**
   * Validates an external raw input object against the entire schema.
   * Overload 3: Validates an external `rawInput` object.
   * @param input The external input object to validate.
   * @returns A Promise that resolves to `undefined` if validation passes, or an `Error` instance if validation fails.
   */
  validate(input: SchemaInput<O>): Promise<undefined | Error>;
  /**
   * Validates a specific field with an external value.
   * Overload 4: Validates a specific field with an external value.
   * @param field The name of the field to validate.
   * @param value The external value for the field.
   * @returns A Promise that resolves to `undefined` if validation passes, or an `Error` instance if validation fails.
   */
  validate<F extends keyof O>(
    field: F,
    value: SchemaInput<O>[F]
  ): Promise<undefined | Error>;
}
