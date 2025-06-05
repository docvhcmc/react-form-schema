import { useFormSchema } from '@docvhcmc/react-form-schema/zod';
import './index.css';

import {
  defineFormSchema,
  type FieldError,
} from '@docvhcmc/react-form-schema/zod';

type User = {
  name: string;
  age: number;
};

const schemaOptions = defineFormSchema({
  name: (s) => s.string().max(16).min(6),
  age: (s) => s.number().min(6),
});

const TextInput: React.FC<{
  label: string;
  defaultValue?: string;
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
    {error && <span className="mt-1 text-red-400">{error}</span>}
  </div>
);

function App() {
  const {
    rawInput,
    errors,
    isValid,
    handleChange,
    handleSubmit,
    setValueFor, // Curried setter for individual fields
    // reset,
    // setRawValue, // To overwrite all values
    // mergeRawValue, // To partially update values
    // validate, // To manually trigger validation
  } = useFormSchema(
    schemaOptions,
    undefined,
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
      <div className="w-1/3">
        <h2 className="mb-2">User Profile Form</h2>
        <div className="card">
          <TextInput
            label="Name:"
            onChangeValue={setValueFor('name')}
            error={errors.getFirstFieldError('name')}
          />
          <div className="flex flex-col mb-4">
            <label className="mb-2">Age:</label>
            <input
              type="number"
              name="age"
              onChange={handleChange}
              className="flex rounded border grow py-1.5 px-3 focus:outline-none text-white"
            />
            {errors.getFirstFieldError('age') && (
              <span className="mt-1 text-red-400">
                {errors.getFirstFieldError('age')}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid}
            className="rounded-md py-1.5 px-3 border text-white shadow-md cursor-pointer hover:bg-white hover:text-black"
          >
            Submit
          </button>
        </div>
      </div>

      <div className="w-2/3">
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
