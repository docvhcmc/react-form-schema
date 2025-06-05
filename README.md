# react-form-schema

`A type-safe, schema-driven form management library for React and beyond`. It provides a robust `FormSchema` class for handling form logic, validation, and data transformation, along with a convenient `useFormSchema` React hook for seamless integration into your components.

---

## ✨ Features

- **Core `FormSchema` Class:** A powerful, framework-agnostic class designed to manage complex form state, validation, and data parsing efficiently. Use it directly in any JavaScript environment or integrate it with UI frameworks.
- **React `useFormSchema` Hook:** A convenient React hook that wraps the `FormSchema` class, providing an idiomatic and optimized API for effortless form management within your React components.
- **Schema-driven Validation:** Define your form's data shape and validation rules using your preferred schema library (e.g., `Zod`, `Yup`, `Joi`). `react-form-schema` abstracts the validation layer.
- **Real-time Feedback:** Get instant validation feedback as users type, ensuring a smooth user experience.
- **Flexible Error Handling:** Granular control over accessing and displaying field-specific or global errors through a dedicated error manager.
- **Unified Change Handler:** A single handleChange function for all your standard HTML input elements, simplifying form management within React.
- **Manual Validation:** Trigger validation on demand for specific fields or the entire form, giving you full control.
- **Programmatic Control:** Easily set, merge, or reset form values directly via the `FormSchema` instance or useFormSchema hook.
- **Lightweight & Performant:** Built with efficient logic and optimized for minimal re-renders in React, maximizing application performance.
- **Type-Safe:** Fully typed with TypeScript, ensuring a robust and error-resistant development experience from schema definition to form usage.

---

## 🚀 Installation

Install `react-form-schema` along with your chosen schema validation library (e.g., Zod):

```bash
npm install react-form-schema zod
# or
yarn add react-form-schema zod
```

## 📚 Usage

1. Define Your Schema

Your schema definition will depend on the validation library you choose. Here's an example using `Zod4`.

First, define your output interface:

```bash
// schemas/user.ts
import { SchemaOptions } from 'use-form-schema/zod';

export interface UserFormOutput {
  name: string;
  age: number;
}

/**
 * Define your field schemas using factory functions for Zod.
 * Each key corresponds to a field in your UserFormOutput,
 * and its value is a function that receives the `z` object
 * and returns the specific Zod validation type for that field.
 */
export const userSchemaFactories: SchemaOptions<UserFormOutput> = {
  name: (s) => s.string().min(1, 'Name cannot be empty.'),
  age: (s) => s.number().min(18, 'Must be at least 18 years old.').max(100, 'Invalid age.'),
} as const;
```

2. Use the `useFormSchema` Hook

```bash
// components/UserProfileForm.tsx
import React from 'react';
import { useFormSchema, FieldError, SchemaOptions } from 'react-form-schema/zod';

const TextInput: React.FC<{ label: string; name: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string }> = ({ label, name, value, onChange, error }) => (
  <div>
    <label>{label}</label>
    <input type="text" name={name} value={value} onChange={onChange} />
    {error && <span style={{ color: 'red' }}>{error}</span>}
  </div>
);

const NumberInput: React.FC<{ label: string; name: string; value: string | number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; error?: string }> = ({ label, name, value, onChange, error }) => (
  <div>
    <label>{label}</label>
    <input type="number" name={name} value={value} onChange={onChange} />
    {error && <span style={{ color: 'red' }}>{error}</span>}
  </div>
);

function UserProfileForm() {
  // The `useFormSchema` hook internally creates and manages a `FormSchema` instance.
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
  } = useFormSchema<UserFormOutput>(
    userSchemaOptions,
    {
      // Optional: initial values
      name: 'John Doe',
      age: 25,
    },
    true // Enable debug mode (optional, shows console logs)
  );

  // Function called on successful form submission
  const onSubmitValid = (data: UserFormOutput) => {
    console.log('Form is valid, parsed data:', data);
    // This is where you typically send your validated data to a backend API.
    // ALWAYS perform backend validation even if frontend validation passes.
    sendDataToBackend(data);
  };

  // Function called when form submission fails due to validation errors
  const onSubmitInvalid = (validationErrors: FieldError[]) => {
    console.warn('Form is invalid, errors:', fieldErrors);
    // Display error messages to the user
  };

  return (
    <form onSubmit={handleSubmit(onSubmitValid, onSubmitInvalid)}>
      <h2>User Profile</h2>

      <TextInput 
        label="Name:"        
        onChangeValue={setRawValue('name')}
        error={errors.getFirstFieldError('name')}
      />

      <NumberInput 
        label="Age:"        
        onChangeValue={setRawValue('name')}
        error={errors.getFirstFieldError('name')}
      />      

      <button type="submit" disabled={!isValid}>
        Submit
      </button>

    </form>
  );
}
```

## 🛠️ Advanced Usage

## ⚙️ API Reference

## 🤝 Contributing
