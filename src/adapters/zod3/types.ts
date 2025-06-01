import { z } from 'zod';

type ZodTypeFactory = (s: typeof z) => z.ZodType;
export type UnpackZodType<T> = T extends ZodTypeFactory ? ReturnType<T> : T;

export type SchemaOptions<Output> = {
  [k in keyof Output]: z.ZodType | ZodTypeFactory;
};

export type AnyZodObject = z.ZodObject<any, any, any>; // Placeholder for a generic schema type
