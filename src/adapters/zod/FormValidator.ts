import { IFormValidator } from '../../core/IFormValidator';
import { ValidationError } from '../../errors';
import { AnyZodObject } from './types';

export class FormValidator implements IFormValidator<AnyZodObject> {
  async validate(
    data: any,
    schema: AnyZodObject
  ): Promise<undefined | ValidationError> {
    return undefined;
  }
}
