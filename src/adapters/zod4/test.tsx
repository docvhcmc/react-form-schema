import { forwardRef, InputHTMLAttributes } from 'react';
import { FieldError, SchemaOptions, useFormSchema } from './index';

type UserFormOutput = {
  name: string;
  age: number;
};

const userSchemaFactories: SchemaOptions<UserFormOutput> = {
  name: (s) => s.string().min(1, 'Name is required'),
  age: (s) => s.number().min(18, 'You must be at least 18'),
};

interface InputProps<T> extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  onChangeValue?(value?: T): void;
}

const TextInput = forwardRef<HTMLInputElement, InputProps<string>>(
  ({ label, error, onChangeValue, ...rest }, ref) => {
    return (
      <div className="form-field">
        <label>
          <span>{label}</span>
          <input
            type="text"
            ref={ref}
            {...rest}
            onChange={(e) => onChangeValue?.(e.target.value || '')}
          />
        </label>
        {!!error && <p className="error-message">{error}</p>}
      </div>
    );
  }
);

const NumberInput = forwardRef<HTMLInputElement, InputProps<number>>(
  ({ label, error, onChangeValue, ...rest }, ref) => {
    return (
      <div className="form-field">
        <label>
          <span>{label}</span>
          <input
            type="number"
            ref={ref}
            {...rest}
            onChange={(e) =>
              onChangeValue?.(
                !!e.target.value ? parseFloat(e.target.value) : undefined
              )
            }
          />
        </label>
        {!!error && <p className="error-message">{error}</p>}
      </div>
    );
  }
);

function UserProfileForm() {
  // 2. Initialize the hook with your schema factories and optional initial values.
  //    The 'react-form-schema/zod4' adapter internally manages the Zod builder.
  const {
    rawInput,
    errors,
    isValid,
    handleSubmit,
    setValueFor, // Curried setter for individual fields
    reset,
    setRawValue, // To overwrite all values
    mergeRawValue, // To partially update values
    validate, // To manually trigger validation
  } = useFormSchema<UserFormOutput>( // Pass your manually defined Output type here
    userSchemaFactories, // Pass the schema factories
    {
      // Optional: initial values
      name: 'John Doe',
      age: 25,
    },
    true // Enable debug mode (optional, shows console logs)
  );

  // Function called on successful form submission
  const onSubmitValid = (data: UserFormOutput) => {
    console.log('Form data is valid:', data);
    alert(`Form submitted for ${data.name}!`);
    reset(); // Reset form after successful submission
  };

  // Function called when form submission fails due to validation errors
  const onSubmitInvalid = (validationErrors: FieldError[]) => {
    console.error('Form has validation errors:', validationErrors);
    alert('Please correct the errors in the form.');
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}
      className="form-container"
    >
      <h2>User Profile</h2>
      <TextInput label={'Name:'} onChangeValue={setValueFor('name')} />
      <NumberInput label={'Age:'} onChangeValue={setValueFor('age')} />
      <button type="submit" disabled={!isValid}>
        Submit
      </button>
    </form>
  );
}
