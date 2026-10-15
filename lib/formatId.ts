/**
 * Formats any ID string for display in the UI.
 * - UUID format (e.g. "3e4f5a6b-7c8d-..."): shows "#" + first 6 chars uppercased
 * - Prefixed format (e.g. "TEN-123", "INV-5001"): shows as-is (already short)
 * - Other (long random string): shows "#" + first 8 chars
 */
export function formatId(id: string): string {
  if (!id) return '—';

  // UUID: 8-4-4-4-12 hex groups separated by hyphens
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (uuidPattern.test(id)) {
    return '#' + id.replace(/-/g, '').slice(0, 6).toUpperCase();
  }

  // Already a short/prefixed ID like "TEN-123", "INV-5001", "LOG-456"
  if (id.length <= 12) {
    return id;
  }

  // Fallback: truncate with hash prefix
  return '#' + id.slice(0, 8).toUpperCase();
}
