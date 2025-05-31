import { useCallback, useEffect, useMemo, useState } from 'react';
import { FormSchema } from './FormSchema';
import { FormSchemaOptions, SchemaInput } from './types';

/**
 * React hook to create and manage a stable FormSchema instance.
 * Ensures that the FormSchema instance is memoized and only re-created
 * when its core dependencies (`fieldSchemas` or `initialValues` references) change.
 * This hook also manages the React state for errors and ensures components re-render
 * when the FormSchema instance's internal state (input values or errors) changes.
 * @param fieldSchemas The schema definitions for the form fields.
 * @param initialValues Optional initial values for the form.
 * @param debug Optional. If true, enables debug logging for the form schema instance.
 * @returns An object containing the FormSchema instance and helper functions for React components.
 */
export function useFormSchema<T extends FormSchemaOptions>(
  fieldSchemas: T,
  initialValues?: Partial<SchemaInput<T>>,
  debug?: boolean // Pass debug flag to the FormSchema constructor
) {
  // Memoize the FormSchema instance to ensure it's stable across renders
  // unless the schema definition or initial values reference change.
  const formSchema = useMemo(
    () => new FormSchema(fieldSchemas, initialValues, debug), // Pass debug here
    [fieldSchemas, initialValues, debug] // Include debug in dependencies
  );

  // Use a state variable to force re-renders in consuming components
  // when the FormSchema instance notifies of internal state changes.
  const [_, forceUpdate] = useState(0);

  // Subscribe to FormSchema changes on component mount and unsubscribe on unmount.
  useEffect(() => {
    const subscriber = () => forceUpdate((prev) => prev + 1);
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

  // Helper function to get error for a specific field for use in components
  const getFieldError = useCallback(
    (field: keyof T) => {
      return formSchema.getFieldError(String(field));
    },
    [formSchema]
  );

  // Expose the formSchema instance and helper functions
  return {
    form: formSchema,
    getFieldError,
    // Bạn có thể thêm các hàm tiện ích khác ở đây nếu muốn, ví dụ:
    // errors: formSchema.getErrors(), // Lấy tất cả lỗi, sẽ re-render khi lỗi thay đổi
    // getRawValue: formSchema.getRawValue,
    // getValidatedValue: formSchema.getValidatedValue,
    // ...
  };
}
