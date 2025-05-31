import { z } from 'zod/v4';

type ZodTypeFactory = (s: typeof z) => z.ZodType;
export type UnpackZodType<T> = T extends ZodTypeFactory ? ReturnType<T> : T;

export type FormSchemaOptions = {
  [k: string]: z.ZodType | ZodTypeFactory;
};

/**
 * Helper type to extract the input type from a Zod schema based on FormSchemaOptions.
 * @template T - The type of the FormSchemaOptions.
 */
export type SchemaInput<T extends FormSchemaOptions> = {
  [K in keyof T]: z.input<UnpackZodType<T[K]>>;
};

/**
 * Helper type to extract the output type of a Zod schema based on FormSchemaOptions.
 * @template T - The type of the FormSchemaOptions.
 */
export type SchemaOutput<T extends FormSchemaOptions> = {
  [K in keyof T]: z.infer<UnpackZodType<T[K]>>;
};
