import { z } from 'zod';
import { ValidationCode } from '../../constants';
import { FormErrorManager } from '../../core/FormErrorManager';
import { ValidationError } from '../../errors';
import { SchemaInput, ValidationRule } from '../../types';
import { buildValidationError } from './buildValidationError';
import { resolveFieldSchemas } from './resolveFieldSchemas';
import { AnyZodObject, FormSchemaDefinition } from './types';

/**
 * Core class for managing form state, validation, and data transformation using **Zod**.
 * It encapsulates the Zod schema, raw input values, validation errors, and provides
 * methods for updating values, validating, parsing, and observing changes.
 *
 * @template O - Represents the inferred output type of the Zod schema.
 */
export class FormSchema<O> {
  // Stores the raw, untransformed input values from the form.
  private _rawInput: Partial<SchemaInput<O>> = {};
  // The main Zod object schema for the entire form.
  private _schema: AnyZodObject;
  // Tracks fields that have custom `refine` rules applied,
  // indicating that parsing them requires validating the whole schema.
  private _refinedFields: string[] = [];
  // Stores the normalized Zod schemas for each individual field.
  private _fieldSchemas: { [K in keyof O]: z.ZodType };
  // Cache for field-specific setter functions to ensure stable references,
  // which is crucial for React performance (e.g., with `React.memo`).
  private _setterCache = new Map<
    keyof O,
    (value: SchemaInput<O>[keyof O]) => void
  >();
  // Type-level property for direct inference of the output type from the class instance.
  public __outputType!: O;

  // Internal store for current validation errors, managed by FormErrorManager.
  private _errorsManager: FormErrorManager;

  // Set of callback functions to notify React components about state changes.
  private _subscribers = new Set<() => void>();

  // Debug flag to enable/disable console logging for development purposes.
  private _debug: boolean;

  /**
   * Constructs a new FormSchema instance.
   * @param schemaOptions The raw schema definitions for each form field, optionally followed by custom validation rules.
   * @param initialValues Optional initial values to pre-populate the form's raw input.
   * @param debug Optional. If true, enables debug logging for the form schema instance.
   */
  constructor(
    readonly schemaOptions: FormSchemaDefinition<O>,
    initialValues?: Partial<SchemaInput<O>>,
    debug?: boolean
  ) {
    // Determine the field schemas from schemaOptions.
    this._fieldSchemas = Array.isArray(schemaOptions)
      ? resolveFieldSchemas(schemaOptions[0])
      : resolveFieldSchemas(schemaOptions);
    this._schema = z.object(this._fieldSchemas);

    if (initialValues) {
      this._rawInput = { ...initialValues };
    }

    // Apply custom rules if they are provided as part of the schemaOptions array.
    if (Array.isArray(schemaOptions)) {
      // Extract rules from the rest of the array after the field schemas.
      const [, ...rules] = schemaOptions;
      rules.forEach((rule) => {
        this.applyRule(rule);
      });
    }
    this._debug =
      process.env.NODE_ENV === 'production' ? false : debug || false;

    this._errorsManager = new FormErrorManager(); // Initialize the error manager

    if (this._debug) {
      console.log('FormSchema initialized with debug mode.', {
        schemaOptions,
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
   * Provides access to the FormErrorManager instance for detailed error handling.
   */
  public get errors(): FormErrorManager {
    return this._errorsManager;
  }

  /**
   * Indicates whether the form is currently valid (has no errors).
   */
  public get isValid(): boolean {
    return !this._errorsManager.hasError();
  }

  /**
   * Retrieves the raw input value(s) from the form, without any Zod parsing or validation.
   * This is useful for displaying current input or performing immediate checks without schema logic.
   * @param field Optional. The name of the specific field to retrieve.
   * @returns The raw input value for the specified field, or the entire raw input object if no field is specified.
   */
  public getRawValue(): SchemaInput<O>;
  public getRawValue<F extends keyof O>(
    field: F
  ): SchemaInput<O>[F] | undefined;
  public getRawValue<F extends keyof O>(
    field?: F
  ): SchemaInput<O> | SchemaInput<O>[F] | undefined {
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
  public async getValidatedValue(): Promise<O>;
  public async getValidatedValue<F extends keyof O>(field: F): Promise<O[F]>;
  public async getValidatedValue<F extends keyof O>(
    field?: F
  ): Promise<O | O[F]> {
    if (this._debug) {
      console.log(`getValidatedValue called for field: ${String(field)}`);
    }
    // Clear all errors before attempting full validation for getValidatedValue (since it implies final submission)
    this._errorsManager.clearErrors();
    if (field === undefined) {
      // Case 1: Retrieve entire form data
      const result = await this._schema.safeParseAsync(this._rawInput);
      if (result.success) {
        this._errorsManager.clearErrors(); // Ensure no lingering errors if previously invalid
        this._notifySubscribers();
        if (this._debug) {
          console.log('getValidatedValue (full form) success:', result.data);
        }
        return result.data as O;
      }
      // If validation fails for the whole form, throw the error
      const validationError = buildValidationError(
        result.error,
        undefined,
        this._debug
      );
      this._updateErrors(validationError); // Update errors for UI
      this._notifySubscribers();
      if (this._debug) {
        console.error('getValidatedValue (full form) failed:', validationError);
      }
      throw validationError;
    } else {
      // Case 2: Retrieve a specific field's value
      if (!(field in this._fieldSchemas)) {
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
    if (this._refinedFields.includes(field as string)) {
      const result = await this._schema.safeParseAsync(this._rawInput);
      if (result.success) {
        const _parsedValue: O[F] = (result.data as any)[field];
        this._errorsManager.clearErrors(); // Ensure no lingering errors
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
      const validationError = buildValidationError(
        result.error,
        String(field),
        this._debug
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
        this._errorsManager.clearErrors(); // Clear errors for this specific field
        this._notifySubscribers();
        if (this._debug) {
          console.log(
            `getValidatedValue (single field ${String(field)}) success:`,
            result.data
          );
        }
        return result.data as O[F];
      }
      // If validation fails for the individual field, throw the error.
      const validationError = buildValidationError(
        result.error,
        String(field),
        this._debug
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
  public async parse(data: SchemaInput<O> | FormData): Promise<O> {
    if (this._debug) {
      console.log('parse called with external data:', data);
    }
    // Clear all errors before parsing external data
    this._errorsManager.clearErrors();

    const formData =
      data instanceof FormData &&
      'entries' in data &&
      typeof data['entries'] === 'function'
        ? Object.fromEntries(data.entries())
        : data; // Handle FormData correctly
    const result = await this._schema.safeParseAsync(formData);
    if (result.success) {
      this._errorsManager.clearErrors(); // Ensure no lingering errors
      this._notifySubscribers();
      if (this._debug) {
        console.log('parse success:', result.data);
      }
      return result.data as O;
    }
    const validationError = buildValidationError(
      result.error,
      undefined,
      this._debug
    );
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
   * The rule definition includes the validation logic (`check`) and error details.
   * @param rule The `ValidationRule` object containing the validation logic, path, code, and optional message/params.
   * @returns The current FormSchema instance for chaining.
   */
  applyRule(rule: ValidationRule<O>): this {
    // Ensure path is an array of strings for Zod's `path` option.
    const _path = (Array.isArray(rule.path) ? rule.path : [rule.path]).map(
      String
    );
    // Keep track of refined fields to ensure full schema validation when they change.
    // This is crucial for optimizing `getValidatedValue` and `validate` methods.
    this._refinedFields.push(..._path);

    // Apply the refinement to the internal Zod schema.
    this._schema = this._schema.refine(
      (data) => {
        return rule.check(data as O);
      },
      {
        message: rule.code || '',
        params: rule.params,
        path: _path,
      }
    ) as any;

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
  public setRawValue(newValues: SchemaInput<O>): void {
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
  public mergeRawValue(partialValues: SchemaInput<O>): void {
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
  setValueFor<F extends keyof O>(field: F) {
    // Return cached setter if available for performance.
    if (this._setterCache.has(field)) {
      // Return the cached setter (type asserted for specific field).
      return this._setterCache.get(field) as (
        value: SchemaInput<O>[F] // Setter expects SchemaInput type
      ) => void;
    }
    // Create and cache a new setter function.
    const setter = (value: SchemaInput<O>[F]) => {
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
      setter as (value: SchemaInput<O>[keyof O]) => void
    );

    return setter;
  }

  /**
   * Resets the form's internal raw input state (`_rawInput`) to its initial state or an empty state.
   * This effectively overwrites the current state and clears all errors.
   * @param initialValues Optional. New initial values to reset the form to. If not provided, resets to empty.
   */
  public reset(initialValues?: SchemaInput<O>): void {
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
  public async validate<F extends keyof O>(
    field: F
  ): Promise<undefined | ValidationError>;
  public async validate(
    input: SchemaInput<O>
  ): Promise<undefined | ValidationError>;
  public async validate<F extends keyof O>(
    field: F,
    value: SchemaInput<O>[F]
  ): Promise<undefined | ValidationError>;
  public async validate<F extends keyof O>(
    arg1?: F | SchemaInput<O>,
    arg2?: SchemaInput<O>[F]
  ): Promise<undefined | ValidationError> {
    if (this._debug) {
      console.log('validate called with args:', { arg1, arg2 });
    }

    let inputToValidate: SchemaInput<O>;
    let fieldToValidate: F | undefined;
    let valueToValidate: SchemaInput<O>[F] | undefined;
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
      this._errorsManager.clearErrors(); // Clear specific field error
    } else if (typeof arg1 === 'object' && arg1 !== null) {
      // Case 3: validate(input: SchemaInput<O>) - Validate external rawInput object.
      // Do not clear internal errors for this scenario as it's an external check.
      inputToValidate = arg1 as SchemaInput<O>;
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
      const error = buildValidationError(
        new Error('Invalid arguments provided to validate method.'),
        undefined,
        this._debug
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
        this._errorsManager.clearErrors(); // Apply global clear if flagged
      }

      if (fieldToValidate === undefined) {
        // If no specific field is targeted, validate the entire determined input.
        const result = await this._schema.safeParseAsync(inputToValidate);
        if (!result.success) {
          const validationError = buildValidationError(
            result.error,
            undefined,
            this._debug
          );
          this._updateErrors(validationError);
          this._notifySubscribers();
          if (this._debug) {
            console.error('validate (full form) failed:', validationError);
          }
          return validationError;
        }
        this._errorsManager.clearErrors(); // Clear all errors if full validation passes
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
        if (this._refinedFields.includes(fieldToValidate as string)) {
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
              const validationError = buildValidationError(
                zodError,
                String(fieldToValidate),
                this._debug
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
          this._errorsManager.clearErrors(); // Clear error for this specific field if refined context passes
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
            const validationError = buildValidationError(
              result.error,
              String(fieldToValidate),
              this._debug
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
          this._errorsManager.clearErrors(); // Clear error for this specific field
        }
      }
      this._notifySubscribers(); // Notify if validation passes and errors might have been cleared
      if (this._debug) {
        console.log('Validation successful.');
      }
      return undefined; // Validation successful, no error.
    } catch (e) {
      // Catch any unexpected errors that might occur during validation (e.g., in custom Zod transforms).
      const error = buildValidationError(
        e,
        fieldToValidate ? String(fieldToValidate) : undefined,
        this._debug
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
   * Updates the internal error state based on a ValidationError instance.
   * It clears existing errors and populates them with the new validation error issues.
   * @param validationError The ValidationError instance containing new errors, or undefined if no errors.
   */
  private _updateErrors(validationError: ValidationError | undefined): void {
    this._errorsManager.clearErrors(); // Start by clearing all errors

    // Corrected: Access `validationError.fields` which holds FieldError[]
    if (validationError && validationError.fields.length > 0) {
      this._errorsManager.setErrors(validationError.fields);
    }
    // If validationError is undefined or has no fields, _errorsManager is already cleared.
  }
}

export type FormSchemaOutput<S extends FormSchema<any>> = S['__outputType'];
