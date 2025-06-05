import { z } from 'zod/v4';

import { defineFormSchema } from './defineFormSchema';
import { FormSchema } from './FormSchema';

const formSchema = defineFormSchema(
  {
    name: z.string(),
    age: z.number(),
    birthDay: (s) => s.date(),
  },
  {
    path: 'name',
    code: '',
    params: {},
    check: (data) => {
      return true;
    },
  }
);

const formSchemaInstance = new FormSchema(formSchema);
formSchemaInstance.getRawValue();
