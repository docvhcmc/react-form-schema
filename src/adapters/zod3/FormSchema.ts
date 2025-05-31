import { z } from 'zod';
import { ValidationCode } from '../../constants/errorCodes';
import { ValidationError } from '../../errors';
import { NonEmptyArray } from '../../types';
import {
  FormSchemaOptions,
  SchemaInput,
  SchemaOutput,
  UnpackZodType,
} from './types';
import { normalizeZodSchemaOptions } from './normalizeZodSchemaOptions';

/**
 * Core class for managing form state, validation, and data transformation using Zod.
 * It encapsulates the schema, raw input values, validation errors, and provides
 * methods for updating values, validating, parsing, and observing changes.
 * @template T - The type of the schema options (a record of ZodTypes or ZodType functions).
 */
export class FormSchema<T extends FormSchemaOptions> {
  // Stores the raw, untransformed input values from the form.
  private _rawInput: Partial<SchemaInput<T>> = {};
  // The main Zod object schema for the entire form.
  private _schema: z.AnyZodObject;
  // Tracks fields that have custom `refine` rules applied,
  // indicating that parsing them requires validating the whole schema.
  private _refinedFields: Array<keyof T> = [];
  // Stores the normalized Zod schemas for each individual field.
  private _fieldSchemas: { [K in keyof T]: UnpackZodType<T[K]> };
  // Cache for field-specific setter functions to ensure stable references,
  // which is crucial for React performance (e.g., with `React.memo`).
  private _setterCache = new Map<
    keyof T,
    (value: SchemaOutput<T>[keyof T]) => void
  >();
  // Type-level property for direct inference of the output type from the class instance.
  public __outputType!: SchemaOutput<T>;

  // Internal store for current validation errors, mapping field path to error message.
  // Key is the path of the field (eg 'name', 'address.street'), value is the error message.
  private _errors: Record<string, string | undefined> = {};

  // Set of callback functions to notify React components about state changes.
  private _subscribers = new Set<() => void>();

  // Debug flag to enable/disable console logging for development purposes.
  private _debug: boolean;

  /**
   * Constructs a new FormSchema instance.
   * @param fieldSchemas The raw schema definitions for each form field.
   * @param initialValues Optional initial values to pre-populate the form's raw input.
   */
  constructor(
    private readonly fieldSchemas: T,
    initialValues?: Partial<SchemaInput<T>>,
    debug?: boolean
  ) {
    this._fieldSchemas = normalizeZodSchemaOptions(fieldSchemas);
    this._schema = z.object(this._fieldSchemas);
    if (initialValues) {
      this._rawInput = { ...initialValues };
    }
    this._debug =
      process.env.NODE_ENV === 'production' ? false : debug || false;
    if (this._debug) {
      console.log('FormSchema initialized with debug mode.', {
        fieldSchemas,
        initialValues,
      });
    }
  }

  /**
   * Subscribes a callback function to listen for changes in the form's state (input or errors).
   * @param callback The function to call when the form state changes.
   */
  public subscribe(callback: () => void): void {
    this._subscribers.add(callback);
    if (this._debug) {
      console.log('Subscriber added.', this._subscribers.size);
    }
  }

  /**
   * Unsubscribes a callback function.
   * @param callback The function to remove from the subscriber list.
   */
  public unsubscribe(callback: () => void): void {
    this._subscribers.delete(callback);
    if (this._debug) {
      console.log('Subscriber removed.', this._subscribers.size);
    }
  }

  /**
   * Retrieves the current validation errors for all fields.
   * @returns An object mapping field paths to their error messages, or undefined if no error.
   */
  public getErrors(): Record<string, string | undefined> {
    // Return a shallow copy to prevent direct mutation of the internal errors state.
    return { ...this._errors };
  }

  /**
   * Retrieves the error message for a specific field.
   * @param fieldPath The path of the field (e.g., 'name', 'address.street').
   * @returns The error message string, or undefined if the field has no error.
   */
  public getFieldError(fieldPath: string): string | undefined {
    return this._errors[fieldPath];
  }

  /**
   * Retrieves the raw input value(s) from the form, without any Zod parsing or validation.
   * This is useful for displaying current input or performing immediate checks without schema logic.
   * @param field Optional. The name of the specific field to retrieve.
   * @returns The raw input value for the specified field, or the entire raw input object if no field is specified.
   */
  public getRawValue(): Partial<SchemaInput<T>>;
  public getRawValue<F extends keyof T>(
    field: F
  ): SchemaInput<T>[F] | undefined;
  public getRawValue<F extends keyof T>(
    field?: F
  ): Partial<SchemaInput<T>> | SchemaInput<T>[F] | undefined {
    if (field === undefined) {
      // Return a shallow copy to prevent external modification of the internal state.
      return { ...this._rawInput };
    }
    return this._rawInput[field];
  }

  /**
   * Retrieves the parsed and validated value(s) from the form's internal state (`_rawInput`) using Zod.
   * This method performs asynchronous validation and transformation.
   * It throws a ValidationError if validation fails.
   *
   * Overload 1: Retrieves the entire parsed and validated form data.
   * Overload 2: Retrieves a specific field's parsed and validated value.
   * @param field Optional. The name of the specific field to retrieve.
   * @returns A promise that resolves to the parsed and validated value for the specified field,
   * or the entire parsed form object if no field is specified.
   * @throws ValidationError if validation fails.
   */
  public async getValidatedValue(): Promise<SchemaOutput<T>>;
  public async getValidatedValue<F extends keyof T>(
    field: F
  ): Promise<SchemaOutput<T>[F]>;
  public async getValidatedValue<F extends keyof T>(
    field?: F
  ): Promise<SchemaOutput<T> | SchemaOutput<T>[F]> {
    if (this._debug) {
      console.log(`getValidatedValue called for field: ${String(field)}`);
    }
    // Clear all errors before attempting full validation for getValidatedValue (since it implies final submission)
    this._clearErrors();
    if (field === undefined) {
      // Case 1: Retrieve entire form data
      const result = await this._schema.safeParseAsync(this._rawInput);
      if (result.success) {
        this._clearErrors(); // Ensure no lingering errors if previously invalid
        this._notifySubscribers();
        if (this._debug) {
          console.log('getValidatedValue (full form) success:', result.data);
        }
        return result.data as SchemaOutput<T>;
      }
      // If validation fails for the whole form, throw the error
      const validationError = this.buildValidationError(result.error);
      this._updateErrors(validationError); // Update errors for UI
      this._notifySubscribers();
      if (this._debug) {
        console.error('getValidatedValue (full form) failed:', validationError);
      }
      throw validationError;
    } else {
      // Case 2: Retrieve a specific field's value
      if (!(field in this.fieldSchemas)) {
        const error = new ValidationError(
          [
            {
              path: String(field),
              code: ValidationCode.FIELD_UNKNOWN,
              message: `Unknown Field: ${String(field)}`,
            },
          ],
          `Unknown Field: ${String(field)}`
        );
        this._updateErrors(error);
        this._notifySubscribers();
        if (this._debug) {
          console.error('getValidatedValue (unknown field) failed:', error);
        }
        throw error;
      }
    }

    // If the field is part of a refined schema (affected by a global rule),
    // we must parse the entire schema to ensure correct cross-field validation/transformation.
    if (this._refinedFields.includes(field)) {
      const result = await this._schema.safeParseAsync(this._rawInput);
      if (result.success) {
        const _parsedValue: SchemaOutput<T>[F] = (result.data as any)[field]; // get(result.data, field);
        this._clearErrors(); // Ensure no lingering errors
        this._notifySubscribers();
        if (this._debug) {
          console.log(
            `getValidatedValue (refined field ${String(field)}) success:`,
            _parsedValue
          );
        }
        return _parsedValue;
      }
      // If validation fails for the whole form (due to refined field or other issues), throw the error.
      const validationError = this.buildValidationError(
        result.error,
        String(field)
      );
      this._updateErrors(validationError); // Update errors for UI
      this._notifySubscribers();
      if (this._debug) {
        console.error(
          `getValidatedValue (refined field ${String(field)}) failed:`,
          validationError
        );
      }
      throw validationError;
    } else {
      // If the field is not refined, parse only its individual schema using its raw input value.
      const fieldSchema = this._fieldSchemas[field] as z.ZodType;
      const result = await fieldSchema.safeParseAsync(this._rawInput[field]);
      if (result.success) {
        this._clearFieldError(String(field)); // Clear error for this specific field
        this._notifySubscribers();
        if (this._debug) {
          console.log(
            `getValidatedValue (single field ${String(field)}) success:`,
            result.data
          );
        }
        return result.data as SchemaOutput<T>[F];
      }
      // If validation fails for the individual field, throw the error.
      const validationError = this.buildValidationError(
        result.error,
        String(field)
      );
      this._updateErrors(validationError); // Update error for this specific field
      this._notifySubscribers();
      if (this._debug)
        console.error(
          `getValidatedValue (single field ${String(field)}) failed:`,
          validationError
        );
      throw validationError;
    }
  }

  /**
   * Parses and validates an external data object or FormData against the entire schema.
   * This method performs asynchronous validation and transformation.
   * It throws a ValidationError if validation fails.
   * @param data The external data object or FormData to parse.
   * @returns A promise that resolves to the parsed and validated data.
   * @throws ValidationError if validation fails.
   */
  public async parse(
    data: Partial<Record<keyof T, any>> | FormData
  ): Promise<SchemaOutput<T>> {
    if (this._debug) {
      console.log('parse called with external data:', data);
    }
    // Clear all errors before parsing external data
    this._clearErrors();

    const formData = data instanceof Iterator ? Object.fromEntries(data) : data;
    const result = await this._schema.safeParseAsync(formData);
    if (result.success) {
      this._clearErrors(); // Ensure no lingering errors
      this._notifySubscribers();
      if (this._debug) {
        console.log('parse success:', result.data);
      }
      return result.data as SchemaOutput<T>;
    }
    const validationError = this.buildValidationError(result.error);
    this._updateErrors(validationError); // Update errors for UI
    this._notifySubscribers();
    if (this._debug) {
      console.error('parse failed:', validationError);
    }
    throw validationError;
  }

  /**
   * Applies a custom refinement rule to the entire schema.
   * This allows for cross-field validation or complex asynchronous checks.
   * @param check The asynchronous or synchronous function to validate the parsed data.
   * @param message The error message details (code, path, params) if validation fails.
   * @returns The current FormSchema instance for chaining.
   */
  applyRule(
    check: (data: z.infer<typeof this._schema>) => boolean | Promise<boolean>,
    message: {
      code: string;
      path: keyof T | NonEmptyArray<keyof T>;
      params?: {
        [k: string]: any;
      };
    }
  ): this {
    const _path = (
      Array.isArray(message.path) ? message.path : [message.path]
    ).map(String); // Ensure path is an array of strings
    // Keep track of refined fields to ensure full schema validation when they change.
    this._refinedFields.push(..._path);
    // Apply the refinement to the internal Zod schema.
    this._schema = this._schema.refine(check, {
      message: message.code || '',
      params: message.params,
      path: _path,
    }) as any;
    if (this._debug) {
      console.log('Refinement rule applied to paths:', _path);
    }
    return this;
  }

  /**
   * Overwrites the entire raw input state of the form with the new values.
   * This is useful for completely replacing the form's data, e.g., when loading
   * a new record from an API or clearing the form.
   * It also triggers a full form validation and updates error state.
   * @param newValues The new raw input values to set.
   */
  public setRawValue(newValues: Partial<SchemaInput<T>>): void {
    this._rawInput = { ...newValues };
    if (this._debug) {
      console.log('setRawValue called with:', newValues);
    }
    // Trigger full form validation and update errors.
    this.validate()
      .then(() => {
        if (this._debug) {
          console.log('Full form validation after setRawValue completed.');
        }
      })
      .catch((e) => {
        console.error('Unexpected error during setRawValue validation:', e);
      });
  }

  /**
   * Merges the provided partial values into the existing raw input state.
   * Existing fields not present in `partialValues` will be retained.
   * This is useful for applying incremental updates to the form's data.
   * It also triggers a full form validation and updates error state.
   * @param partialValues The partial raw input values to merge.
   */
  public mergeRawValue(partialValues: Partial<SchemaInput<T>>): void {
    this._rawInput = { ...this._rawInput, ...partialValues };
    if (this._debug) {
      console.log('mergeRawValue called with:', partialValues);
    }
    // Trigger full form validation and update errors.
    this.validate()
      .then(() => {
        if (this._debug) {
          console.log('Full form validation after mergeRawValue completed.');
        }
      })
      .catch((e) => {
        console.error('Unexpected error during mergeRawValue validation:', e);
      });
  }

  /**
   * Returns a memoized setter function for a specific form field.
   * This setter updates the form's internal raw input state (`_rawInput`).
   * It also triggers field-specific validation and updates error state.
   * @param field The name of the field for which to create a setter.
   * @returns A function that takes a value (of SchemaInput type) and updates the corresponding field.
   */
  setValueFor<F extends keyof T>(field: F) {
    // Return cached setter if available for performance.
    if (this._setterCache.has(field)) {
      // Return the cached setter (type asserted for specific field).
      return this._setterCache.get(field) as (
        value: SchemaInput<T>[F] // Setter expects SchemaInput type
      ) => void;
    }
    // Create and cache a new setter function.
    const setter = (value: SchemaInput<T>[F]) => {
      this._rawInput[field] = value;
      if (this._debug) {
        console.log(`setValueFor '${String(field)}' called with:`, value);
      }
      // Trigger field-specific validation and update errors.
      // The `validate` method will internally call `_updateErrors` and `_notifySubscribers`.
      this.validate(field)
        .then(() => {
          if (this._debug) {
            console.log(`Validation for '${String(field)}' completed.`);
          }
        })
        .catch((e) => {
          // This catch block handles unexpected errors from validate(), as validate() itself returns ValidationError.
          console.error(
            `Unexpected error during setValueFor validation for '${String(
              field
            )}':`,
            e
          );
        });
    };
    this._setterCache.set(
      field,
      setter as (value: SchemaOutput<T>[keyof T]) => void
    );

    return setter;
  }

  /**
   * Resets the form's internal raw input state (`_rawInput`) to its initial state or an empty state.
   * This effectively overwrites the current state and clears all errors.
   * @param initialValues Optional. New initial values to reset the form to. If not provided, resets to empty.
   */
  public reset(initialValues?: Partial<SchemaInput<T>>): void {
    if (this._debug) {
      console.log('reset called with initialValues:', initialValues);
    }
    // Reuses setRawValue to perform the overwrite/initialization behavior.
    // setRawValue will internally call validate and notify subscribers.
    this.setRawValue(initialValues || {});
  }

  /**
   * Validates input data (either internal _rawInput or external data)
   * and returns a ValidationError if invalid, or undefined if valid.
   * This method performs asynchronous validation but does NOT throw errors for validation failures.
   * It also updates the internal error state and notifies subscribers.
   *
   * Overload 1: Validates the entire internal _rawInput.
   * Overload 2: Validates a specific field from the internal _rawInput.
   * Overload 3: Validates an external rawInput object.
   * Overload 4: Validates a specific field with an external value.
   *
   * @param arg1 Optional. Can be a field name (string) or an external input object.
   * @param arg2 Optional. The value for a specific field when arg1 is a field name.
   * @returns A Promise that resolves to `undefined` if validation passes,
   * or a `ValidationError` instance if validation fails.
   */
  public async validate(): Promise<undefined | ValidationError>;
  public async validate<F extends keyof T>(
    field: F
  ): Promise<undefined | ValidationError>;
  public async validate(
    input: Partial<SchemaInput<T>>
  ): Promise<undefined | ValidationError>;
  public async validate<F extends keyof T>(
    field: F,
    value: SchemaInput<T>[F]
  ): Promise<undefined | ValidationError>;
  public async validate<F extends keyof T>(
    arg1?: F | Partial<SchemaInput<T>>,
    arg2?: SchemaInput<T>[F]
  ): Promise<undefined | ValidationError> {
    if (this._debug) console.log('validate called with args:', { arg1, arg2 });

    let inputToValidate: Partial<SchemaInput<T>>;
    let fieldToValidate: F | undefined;
    let valueToValidate: SchemaInput<T>[F] | undefined;
    let shouldClearAllErrors = false; // Flag to decide if all internal errors should be cleared

    // Determine which overload is being used and set up variables accordingly.
    if (arg1 === undefined) {
      // Case 1: validate() - Validate internal _rawInput.
      inputToValidate = this._rawInput;
      shouldClearAllErrors = true; // Clear all errors for full form validation
    } else if (typeof arg1 === 'string' && arg2 === undefined) {
      // Case 2: validate(field: F) - Validate internal _rawInput for a specific field.
      fieldToValidate = arg1 as F;
      inputToValidate = this._rawInput; // Need full rawInput for potential refined fields.
      this._clearFieldError(String(fieldToValidate)); // Clear specific field error
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // Case 3: validate(input: Partial<SchemaInput<T>>) - Validate external rawInput object.
      // Do not clear internal errors for this scenario as it's an external check.
      inputToValidate = arg1 as Partial<SchemaInput<T>>;
    } else if (typeof arg1 === 'string' && arg2 !== undefined) {
      // Case 4: validate(field: F, value: SchemaInput<T>[F]) - Validate external field-value pair.
      // Do not clear internal errors for this scenario as it's an external check.
      fieldToValidate = arg1 as F;
      valueToValidate = arg2;
      // For external field-value validation, temporarily construct an input object
      // by combining internal state with the provided field value for accurate context.
      inputToValidate = {
        ...this._rawInput,
        [fieldToValidate]: valueToValidate,
      };
    } else {
      const error = this.buildValidationError(
        new Error('Invalid arguments provided to validate method.')
      );
      this._updateErrors(error);
      this._notifySubscribers();
      if (this._debug) {
        console.error('validate (invalid args) failed:', error);
      }
      return error;
    }

    try {
      if (shouldClearAllErrors) {
        this._clearErrors(); // Apply global clear if flagged
      }

      if (fieldToValidate === undefined) {
        // If no specific field is targeted, validate the entire determined input.
        const result = await this._schema.safeParseAsync(inputToValidate);
        if (!result.success) {
          const validationError = this.buildValidationError(result.error);
          this._updateErrors(validationError);
          this._notifySubscribers();
          if (this._debug) {
            console.error('validate (full form) failed:', validationError);
          }
          return validationError;
        }
        this._clearErrors(); // Clear all errors if full validation passes
      } else {
        // Validate a specific field.
        if (!(fieldToValidate in this._fieldSchemas)) {
          const error = new ValidationError(
            [
              {
                path: String(fieldToValidate),
                code: ValidationCode.FIELD_UNKNOWN,
                message: `Unknown Field: ${String(fieldToValidate)}`,
              },
            ],
            `Unknown Field: ${String(fieldToValidate)}`
          );
          this._updateErrors(error);
          this._notifySubscribers();
          if (this._debug) {
            console.error(
              `validate (unknown field ${String(fieldToValidate)}) failed:`,
              error
            );
          }
          return error;
        }

        // If the field is part of a refined schema, we must validate the full context (`inputToValidate`)
        // and then filter for errors specific to the targeted field.
        if (this._refinedFields.includes(fieldToValidate)) {
          const result = await this._schema.safeParseAsync(inputToValidate);
          if (!result.success) {
            const fieldErrors = result.error.issues.filter((issue) => {
              const issuePath = (issue.path || []).join('.');
              const targetPath = String(fieldToValidate);
              // Check if the issue path is exactly the field, or starts with the field path.
              return (
                issuePath === targetPath ||
                issuePath.startsWith(`${targetPath}.`)
              );
            });
            if (fieldErrors.length > 0) {
              const zodError = new z.ZodError(fieldErrors);
              const validationError = this.buildValidationError(
                zodError,
                String(fieldToValidate)
              );
              this._updateErrors(validationError);
              this._notifySubscribers();
              if (this._debug) {
                console.error(
                  `validate (refined field ${String(fieldToValidate)}) failed:`,
                  validationError
                );
              }
              return validationError;
            }
          }
          this._clearFieldError(String(fieldToValidate)); // Clear error for this specific field if refined context passes
        } else {
          // If the field is not refined, validate its individual schema.
          // Use `valueToValidate` if provided (for external field-value pair),
          // otherwise, get the value from `inputToValidate`.
          const fieldSchema = this._fieldSchemas[fieldToValidate] as z.ZodType;
          const value =
            valueToValidate !== undefined
              ? valueToValidate
              : inputToValidate[fieldToValidate];

          const result = await fieldSchema.safeParseAsync(value);
          if (!result.success) {
            const validationError = this.buildValidationError(
              result.error,
              String(fieldToValidate)
            );
            this._updateErrors(validationError);
            this._notifySubscribers();
            if (this._debug) {
              console.error(
                `validate (single field ${String(fieldToValidate)}) failed:`,
                validationError
              );
            }
            return validationError;
          }
          this._clearFieldError(String(fieldToValidate)); // Clear error for this specific field
        }
      }
      this._notifySubscribers(); // Notify if validation passes and errors might have been cleared
      if (this._debug) {
        console.log('Validation successful.');
      }
      return undefined; // Validation successful, no error.
    } catch (e) {
      // Catch any unexpected errors that might occur during validation (e.g., in custom Zod transforms).
      const error = this.buildValidationError(
        e,
        fieldToValidate ? String(fieldToValidate) : undefined
      );
      this._updateErrors(error);
      this._notifySubscribers();
      if (this._debug) {
        console.error('validate (unexpected error) failed:', error);
      }
      return error;
    }
  }

  // Private Methods

  /**
   * Helper method to build a consistent ValidationError object from a ZodError or other unknown errors.
   * @param e The error caught (can be ZodError or any other error).
   * @param field Optional. The name of the field primarily associated with the error, if applicable.
   * @returns A ValidationError instance.
   */
  private buildValidationError(e: unknown, field?: string): ValidationError {
    if (this._debug)
      console.log('buildValidationError called for:', e, 'field:', field);
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

  /**
   * Provides direct access to the underlying Zod schema object.
   * @returns The ZodObject instance used for validation.
   */
  public get schema() {
    return this._schema;
  }

  /**
   * Notifies all subscribed listeners about a state change, triggering React re-renders.
   */
  private _notifySubscribers(): void {
    this._subscribers.forEach((callback) => callback());
    if (this._debug) {
      console.log('Notifying subscribers.');
    }
  }

  /**
   * Clears all internal validation errors.
   * This is a private helper, used by methods that re-validate the entire form.
   */
  private _clearErrors(): void {
    this._errors = {};
    if (this._debug) {
      console.log('All errors cleared.');
    }
  }

  /**
   * Clears the error for a specific field path.
   * This is a private helper, used by methods that validate individual fields.
   * @param fieldPath The path of the field to clear the error for.
   */
  private _clearFieldError(fieldPath: string): void {
    if (this._errors[fieldPath] !== undefined) {
      delete this._errors[fieldPath];
      if (this._debug) {
        console.log(`Error for field '${fieldPath}' cleared.`);
      }
    }
  }

  /**
   * Updates the internal error state based on a ValidationError instance.
   * It clears existing errors and populates them with the new validation error issues.
   * @param validationError The ValidationError instance containing new errors, or undefined if no errors.
   */
  private _updateErrors(validationError: ValidationError | undefined): void {
    this._clearErrors(); // Start by clearing all errors

    // Corrected: Access `validationError.fields` instead of `validationError.errors`
    if (validationError && validationError.fields.length > 0) {
      validationError.fields.forEach((err) => {
        const fieldPath = err.path || ''; // Ensure path is a string
        this._errors[fieldPath] = err.message;
        if (this._debug) {
          console.log(`Error updated for '${fieldPath}': ${err.message}`);
        }
      });
    }
  }
}

export type FormSchemaOutput<S extends FormSchema<any>> = S['__outputType'];
