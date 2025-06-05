import { z } from 'zod/v4';
import { ValidationRule } from '../../types';

export type ZodTypeBuilder = (zod: typeof z) => z.ZodType;

export type ResolveZodType<T> = T extends ZodTypeBuilder ? ReturnType<T> : T;

export type FormFieldsDefinition<O> = {
  [k in keyof O]: z.ZodType | ZodTypeBuilder;
};

export type FormSchemaDefinition<O> =
  | FormFieldsDefinition<O>
  | [FormFieldsDefinition<O>, ...ValidationRule<O>[]];

export type AnyZodObject = z.ZodObject<any, any>;
