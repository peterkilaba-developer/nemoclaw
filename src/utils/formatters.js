/**
 * Capitalizes the first letter of each word in a string, ensuring names
 * and corporate entities are clean in the database.
 * 
 * Works gracefully with hyphens and spaces (e.g., "jane-doe" -> "Jane-Doe", "acme corp" -> "Acme Corp")
 * Does not lower-case existing upper-case characters (e.g. "LLC" remains "LLC").
 */
export const capitalizeWords = (str) => {
  if (!str) return '';
  return str.replace(/(^\w|\s\w|-\w)/g, (match) => match.toUpperCase());
};
