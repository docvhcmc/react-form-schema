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
   * A user-friendly error message (optional).
   */
  message?: string;

  origin?: string;
  /**
   * Additional parameters for i18n or dynamic formatting.
   */
  params?: Record<string, unknown>;
};
