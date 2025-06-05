import { useCallback, useEffect, useMemo, useState } from 'react';
import { ValidationCode } from '../../constants';
import { ValidationError } from '../../errors';
import { UseFormSchemaReturn } from '../../interfaces/UseFormSchemaReturn';
import { FieldError, SchemaInput } from '../../types';
import { parseInputValue } from '../../utils/parseInputValue';
import { FormSchema } from './FormSchema';
import { FormSchemaDefinition } from './types';

/**
 * React hook to create and manage a stable FormSchema instance.
 * Ensures that the FormSchema instance is memoized and only re-created
 * when its core dependencies (`fieldSchemas` or `initialValues` references) change.
 * This hook also manages the React state for errors and ensures components re-render
 * when the FormSchema instance's internal state (input values or errors) changes.
 * @param schemaOptions The schema definitions for the form fields.
 * @param initialValues Optional initial values for the form.
 * @param debug Optional. If true, enables debug logging for the form schema instance.
 * @returns An object containing form values, error management functions, and submission handlers.
 */
export function useFormSchema<O>(
  schemaOptions: FormSchemaDefinition<O>,
  initialValues?: SchemaInput<O>,
  debug?: boolean // Pass debug flag to the FormSchema constructor
): UseFormSchemaReturn<O> {
  // Memoize the FormSchema instance to ensure it's stable across renders
  // unless the schema definition or initial values reference change.
  const formSchema = useMemo(
    () => {
      return new FormSchema(schemaOptions, initialValues, debug);
    },
    [schemaOptions, initialValues, debug] // Include debug in dependencies
  );

  // Use a state variable to force re-renders in consuming components
  // when the FormSchema instance notifies of internal state changes.
  // We use the errors array length as a simple way to trigger re-renders
  // when errors change, but the primary trigger should be `formSchema.subscribe`.
  const [currentValues, setCurrentValues] = useState<SchemaInput<O>>(() =>
    formSchema.getRawValue()
  );

  // Use a state variable to force re-renders in consuming components
  // when the FormSchema instance notifies of internal state changes.
  const [_, forceUpdate] = useState(0);

  // Subscribe to FormSchema changes on component mount and unsubscribe on unmount.
  // The subscriber will update the component's state to reflect changes in FormSchema.
  useEffect(() => {
    const subscriber = () => {
      setCurrentValues(formSchema.getRawValue()); // Update values
      forceUpdate((prev) => prev + 1); // Trigger re-render for errors/isValid
    };
    formSchema.subscribe(subscriber);
    if (debug) {
      console.log('useFormSchema: Subscribed to FormSchema instance.');
    }
    return () => {
      formSchema.unsubscribe(subscriber);
      if (debug) {
        console.log('useFormSchema: Unsubscribed from FormSchema instance.');
      }
    };
  }, [formSchema, debug]); // Re-subscribe if formSchema instance or debug flag changes

  // Expose error-related methods directly from the internal FormErrorManager.
  // These are memoized to ensure stable function references for React components.
  const errors = useMemo(() => {
    // This object directly exposes the methods from formSchema._errorsManager
    // but ensures they are memoized.
    return {
      hasError: formSchema.errors.hasError.bind(formSchema.errors),
      getFirstFieldError: formSchema.errors.getFirstFieldError.bind(
        formSchema.errors
      ),
      getErrorsForField: formSchema.errors.getErrorsForField.bind(
        formSchema.errors
      ),
      getAllErrors: formSchema.errors.getAllErrors.bind(formSchema.errors),
      clearErrors: formSchema.errors.clearErrors.bind(formSchema.errors),
      // Additionally, you can add a direct property for the raw errors array if needed,
      // but methods are generally preferred for encapsulation.
      // raw: formSchema.errors.getAllErrors(), // Be careful with this, as it's a snapshot
    };
  }, [formSchema]); // Dependency on formSchema instance

  // Expose isValid status
  const isValid = useMemo(() => formSchema.isValid, [formSchema, errors]); // isValid depends on errors state

  const handleChange = useCallback(
    (
      event: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      const newValue = parseInputValue(event);
      const { name } = event.target;
      formSchema.setValueFor(name as keyof O)(newValue);
    },
    [formSchema]
  );

  // General submit handler that leverages FormSchema's parse method
  const handleSubmit = useCallback(
    (
        onSubmitValid: (data: O) => void,
        onSubmitInvalid?: (errors: FieldError[]) => void
      ) =>
      async (event: React.FormEvent) => {
        event.preventDefault(); // Prevent default browser form submission
        if (debug) {
          console.log('handleSubmit called.');
        }
        try {
          // Attempt to get validated values. This will throw ValidationError if invalid.
          const data = await formSchema.getValidatedValue();
          onSubmitValid(data); // Call success callback
        } catch (e) {
          if (e instanceof ValidationError) {
            if (debug) {
              console.warn('Form validation failed on submit:', e.fields);
            }
            // Errors are already updated in FormSchema._updateErrors and subscribers notified.
            onSubmitInvalid?.(e.fields); // Call error callback with specific errors
          } else {
            console.error(
              'An unexpected error occurred during form submission:',
              e
            );
            // For unexpected errors, you might want a generic error message or log it.
            // You could also call onSubmitInvalid with a generic error field if desired.
            onSubmitInvalid?.([
              {
                path: '',
                code: ValidationCode.UNEXPECTED,
                message: 'An unexpected error occurred during submission.',
              },
            ]);
          }
        }
      },
    [formSchema, debug]
  );

  // Return the necessary values and functions for the React component
  return {
    rawInput: currentValues,
    isValid, // Direct access to the validation status
    errors: errors, // The memoized object with error utility methods
    handleChange,
    handleSubmit,
    // onSubmitError is part of handleSubmit's signature, no need to expose separately
    reset: useCallback(() => formSchema.reset(), [formSchema]),
    setValueFor: useCallback(
      <F extends keyof O>(field: F) => {
        return formSchema.setValueFor(field);
      },
      [formSchema]
    ),
    setRawValue: useCallback(
      (newValues: SchemaInput<O>) => {
        formSchema.setRawValue(newValues);
      },
      [formSchema]
    ),
    mergeRawValue: useCallback(
      (partialValues: SchemaInput<O>) => {
        formSchema.mergeRawValue(partialValues);
      },
      [formSchema]
    ),
    validate: useCallback(
      async (
        field?: keyof O | SchemaInput<O>,
        value?: SchemaInput<O>[keyof O]
      ) => {
        // Direct call to formSchema.validate, ensuring it updates internal state
        return await formSchema.validate(field as any, value as any);
      },
      [formSchema]
    ),
    // Optionally expose FormSchema instance itself for advanced use cases,
    // though the hook aims to abstract most direct interactions.
    // formSchemaInstance: formSchema,
  };
}
