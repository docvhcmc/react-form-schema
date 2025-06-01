import { ValidationError } from '../errors';

/**
 * Interface for a generic form validator.
 * Your specific adapters (Zod, Yup, Joi) would implement this.
 */
export interface IFormValidator<TSchema> {
  validate(data: any, schema: TSchema): Promise<undefined | ValidationError>;
  // Add other methods if needed for parsing/transforming
}
