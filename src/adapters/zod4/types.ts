import { z } from 'zod/v4';
import { ValidationRule } from '../../types';

type ZodTypeFactory = (s: typeof z) => z.ZodType;
export type UnpackZodType<T> = T extends ZodTypeFactory ? ReturnType<T> : T;

export type FieldSchemasOptions<Output> = {
  [k in keyof Output]: z.ZodType | ZodTypeFactory;
};

export type SchemaOptions<O> =
  | FieldSchemasOptions<O>
  | [FieldSchemasOptions<O>, ...ValidationRule<O>[]];

export type AnyZodObject = z.ZodObject<any, any>;
