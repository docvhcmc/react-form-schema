import { z } from 'zod/v4';
import { FieldSchemasOptions, UnpackZodType } from './types';

/**
 * Normalizes the schema options by unpacking any Zod definitions
 * that might be provided as functions (e.g., z => z.string()).
 * This ensures all schema parts are actual Zod types.
 * @param obj - The raw schema options object.
 * @returns An object with unpacked Zod types for each key.
 */
export function normalizeZodSchemaOptions<O>(obj: FieldSchemasOptions<O>): {
  [K in keyof O]: UnpackZodType<FieldSchemasOptions<O>[K]>;
} {
  const result = {} as {
    [K in keyof O]: UnpackZodType<FieldSchemasOptions<O>[K]>;
  };

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      // If the value is a function, call it with `z` to get the actual ZodType.
      // Otherwise, use the value directly.
      result[key] = (
        typeof value === 'function' ? value(z) : value
      ) as UnpackZodType<FieldSchemasOptions<O>[typeof key]>;
    }
  }

  return result;
}
