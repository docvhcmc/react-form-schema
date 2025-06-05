import { z } from 'zod';
import { FormFieldsDefinition, ResolveZodType } from './types';

export function resolveFieldSchemas<O>(
  formFieldsDefinition: FormFieldsDefinition<O>
): {
  [key in keyof O]: ResolveZodType<(typeof formFieldsDefinition)[key]>;
} {
  const result = {} as {
    [key in keyof O]: ResolveZodType<(typeof formFieldsDefinition)[key]>;
  };

  for (const key in formFieldsDefinition) {
    if (Object.prototype.hasOwnProperty.call(formFieldsDefinition, key)) {
      const value = formFieldsDefinition[key];
      // If the value is a function, call it with `z` to get the actual ZodType.
      // Otherwise, use the value directly.
      result[key] = (
        typeof value === 'function' ? value(z) : value
      ) as ResolveZodType<(typeof formFieldsDefinition)[typeof key]>;
    }
  }

  return result;
}
