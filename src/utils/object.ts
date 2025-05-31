/**
 * Safely accesses a deeply nested property in an object using a dot-notation path or an array path.
 *
 * @param obj The object to query.
 * @param path The path to the property to get. Can be a string (e.g., "a.b.c") or an array of strings/numbers (e.g., ["a", "b", 0, "c"]).
 * @param defaultValue The value to return if the resolved value is undefined.
 * @returns The value at the specified path, or `defaultValue` if the path is not found or undefined, or `undefined` if no defaultValue is provided.
 */
export function get<T extends object, R = any>(
  obj: T | null | undefined,
  path: string | Array<string | number>,
  defaultValue?: R
): R | undefined {
  // If the object is null or undefined, we cannot traverse it.
  if (obj === null || typeof obj === 'undefined') {
    return defaultValue;
  }

  // Normalize the path to an array of keys.
  const pathParts = Array.isArray(path)
    ? path
    : path.split('.').filter((part) => part.length > 0);

  let current: any = obj; // Start traversal from the root object

  // Iterate over each part of the path.
  for (let i = 0; i < pathParts.length; i++) {
    const part = pathParts[i];

    // If the current value is null, undefined, or not an object/array,
    // we cannot proceed further down the path.
    if (
      current === null ||
      typeof current !== 'object' ||
      typeof current[part] === 'undefined'
    ) {
      return defaultValue;
    }

    current = current[part]; // Move to the next nested level.
  }

  // After traversing the entire path, return the final value.
  // If the final value is explicitly undefined, return defaultValue if provided.
  return typeof current === 'undefined' ? defaultValue : current;
}
