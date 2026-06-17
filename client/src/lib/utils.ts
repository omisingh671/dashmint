/**
 * Formats database table or column names to spaced Title Case (e.g. room_products -> Room Products)
 */
export function formatDisplayName(name: string): string {
  if (!name) return '';
  return name
    .replace(/_/g, ' ')                        // Replace all underscores with spaces
    .replace(/([a-z])([A-Z])/g, '$1 $2')       // Insert space between lowercase and uppercase letters (camelCase)
    .replace(/\s+/g, ' ')                      // Collapse multiple spaces to single space
    .split(' ')                                // Split by spaces
    .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each word
    .join(' ')                                 // Join back with spaces
    .trim();
}
