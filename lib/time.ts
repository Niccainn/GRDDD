/**
 * Relative time formatting utility.
 * Returns human-readable relative timestamps.
 */
export function relativeTime(date: Date | string): string {
  const now = Date.now();
  const then = typeof date === 'string' ? new Date(date).getTime() : date.getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;

  const days = Math.floor(seconds / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;

  // Older than a week — show short date
  const d = typeof date === 'string' ? new Date(date) : date;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}

/**
 * Format a duration in minutes to a human-readable string.
 * Examples: 150 -> "2h 30m", 45 -> "45m", 480 -> "8h", 0 -> "0m"
 */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Parse a duration string to minutes.
 * Accepts: "2h 30m", "2h30m", "2.5", "2:30", "45m", "2h"
 */
export function parseDuration(input: string): number {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Try "Xh Ym" or "XhYm" pattern
  const hmMatch = trimmed.match(/^(\d+)\s*h\s*(?:(\d+)\s*m)?$/i);
  if (hmMatch) {
    return parseInt(hmMatch[1]) * 60 + (hmMatch[2] ? parseInt(hmMatch[2]) : 0);
  }

  // Try "Ym" pattern
  const mMatch = trimmed.match(/^(\d+)\s*m$/i);
  if (mMatch) {
    return parseInt(mMatch[1]);
  }

  // Try "H:MM" pattern
  const colonMatch = trimmed.match(/^(\d+):(\d{1,2})$/);
  if (colonMatch) {
    return parseInt(colonMatch[1]) * 60 + parseInt(colonMatch[2]);
  }

  // Try decimal hours (e.g. "2.5")
  const num = parseFloat(trimmed);
  if (!isNaN(num)) {
    return Math.round(num * 60);
  }

  return 0;
}

/**
 * Convert minutes to decimal hours string.
 * Example: 150 -> "2.50", 45 -> "0.75"
 */
export function minutesToDecimal(minutes: number): string {
  return (minutes / 60).toFixed(2);
}
