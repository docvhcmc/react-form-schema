/**
 * NonEmptyArray<T>
 *
 * A tuple-based type that ensures the array contains at least one element.
 *
 * - The first element is required: [T, ...]
 * - Any number of additional elements of type T can follow: [...T[]]
 *
 * This is useful for enforcing non-empty arrays at the type level,
 * such as when you want to guarantee at least one item in a list.
 *
 * Example:
 * const valid: NonEmptyArray<number> = [1, 2, 3]; // ✅ OK
 * const invalid: NonEmptyArray<number> = [];      // ❌ Error: must have at least one element
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Defines the structure of a single field error.
 */
export type FieldError = {
  /**
   * The field path that caused the error (e.g. "email", "user.name").
   */
  path: string;
  /**
   * A machine-readable error code (e.g. "REQUIRED", "INVALID_FORMAT").
   */
  code: string;
  /**
   * An optional default error message. This message can be used as a fallback
   * if no translation is found for the `code`, or for simpler cases where i18n
   * isn't strictly necessary or for quick debugging. When `code` is provided
   * and i18n is used, this message typically serves as a last resort.
   */
  message?: string;

  origin?: string;
  /**
   * Additional parameters for i18n or dynamic formatting.
   */
  params?: Record<string, unknown>;
};

export type SchemaInput<O> = Partial<O>;

export type ValidationRule<O> = {
  /**
   * The path to the field(s) affected by this rule.
   * Can be a single field name (string) or an array for nested fields or cross-field validation.
   * Examples: 'name', ['address', 'street'], ['password', 'confirmPassword']
   */
  path: keyof O | NonEmptyArray<keyof O>;
  /**
   * A unique error code for this specific rule. This code is **required** and serves as
   * the primary key for Internationalization (i18n) lookup. It enables translating
   * error messages and programmatically handling specific validation failures.
   * Example: 'FORM_AGE_TOO_YOUNG', 'STRING_MIN_LENGTH'.
   */
  code: string;
  /**
   * Optional parameters or context data that can be used to dynamically
   * construct the error message. This is essential for parameterized messages
   * and Internationalization (i18n).
   * Example: `{ min: 5, max: 10 }` for a string length rule, or `{ fieldName: 'Name' }`.
   */
  params?: Partial<Record<string, any>>;
  /**
   * An optional default error message. This message can be used as a fallback
   * if no translation is found for the `code`, or for simpler cases where i18n
   * isn't strictly necessary or for quick debugging. When `code` is provided
   * and i18n is used, this message typically serves as a last resort.
   */
  message?: string;
  check: (data: O) => boolean | Promise<boolean>;
};
