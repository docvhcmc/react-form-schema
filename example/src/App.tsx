import { useFormSchema } from '@docvhcmc/react-form-schema/zod4';
import './index.css';

import type {
  FieldError,
  SchemaOptions,
} from '@docvhcmc/react-form-schema/zod4';

type User = {
  name: string;
  age: number;
};

const schemaOptions: SchemaOptions<User> = {
  name: (s) => s.string(),
  age: (s) => s.number(),
};

const TextInput: React.FC<{
  label: string;
  onChangeValue: (value: string | undefined) => void;
  error?: string;
}> = ({ label, onChangeValue, error }) => (
  <div className="flex flex-col mb-4">
    <label className="mb-2">{label}</label>
    <input
      type="text"
      onChange={(e) => onChangeValue(e.target.value)}
      className="flex rounded border grow py-1.5 px-3 focus:outline-none text-white"
    />
    {error && <span style={{ color: 'red' }}>{error}</span>}
  </div>
);

const NumberInput: React.FC<{
  label: string;
  onChangeValue: (value: number | undefined) => void;
  error?: string;
}> = ({ label, onChangeValue, error }) => (
  <div className="flex flex-col mb-4">
    <label className="mb-2">{label}</label>
    <input
      type="number"
      onChange={(e) =>
        onChangeValue(e.target.value ? Number(e.target.value) : undefined)
      }
      className="flex rounded border grow py-1.5 px-3 focus:outline-none text-white"
    />
    {error && <span style={{ color: 'red' }}>{error}</span>}
  </div>
);

function App() {
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
  } = useFormSchema(
    schemaOptions,
    {
      // Optional: initial values
      name: 'John Doe',
      age: 25,
    },
    true // Enable debug mode (optional, shows console logs)
  );
  // Function called on successful form submission
  const onSubmitValid = (data: User) => {
    console.log('Form is valid, parsed data:', data);
    // This is where you typically send your validated data to a backend API.
    // ALWAYS perform backend validation even if frontend validation passes.
    // sendDataToBackend(data);
  };

  // Function called when form submission fails due to validation errors
  const onSubmitInvalid = (validationErrors: FieldError[]) => {
    console.log('validationErrors', validationErrors);
    // Display error messages to the user
  };
  return (
    <form
      onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}
      className="flex flex-row gap-4 justify-center"
    >
      <div className="w-100">
        <h2 className="mb-2">User Profile</h2>
        <div className="card">
          <TextInput
            label="Name:"
            onChangeValue={setValueFor('name')}
            error={errors.getFirstFieldError('name')}
          />
          <NumberInput
            label="Age:"
            onChangeValue={setValueFor('age')}
            error={errors.getFirstFieldError('name')}
          />
          <button type="submit" disabled={!isValid}>
            Submit
          </button>
        </div>
      </div>

      <div className="w-100">
        <h2 className="mb-2">Current Form State:</h2>
        <pre className="card">
          <code>
            {JSON.stringify(
              {
                isValid,
                rawInput,
                allErrors: errors.getAllErrors(),
              },
              null,
              3
            )}
          </code>
        </pre>
      </div>
    </form>
  );
}

export default App;
