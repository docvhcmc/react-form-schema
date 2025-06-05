import { z } from 'zod';
import { ValidationRule } from '../../types';
import { ResolveZodType, ZodTypeBuilder } from './types';

export function defineFormSchema<
  T extends Record<string, z.ZodType | ZodTypeBuilder>
>(
  ...args: [
    fieldSchemas: T,
    ...rules: ValidationRule<{
      [key in keyof T]: z.infer<ResolveZodType<T[key]>>;
    }>[]
  ]
) {
  return args;
}
