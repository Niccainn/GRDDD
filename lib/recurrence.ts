type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

interface ParsedRule {
  freq: Frequency;
  interval: number;
  byDay?: string[];
  count?: number;
}

export function parseRRule(rule: string): ParsedRule | null {
  if (!rule) return null;
  const parts = rule.split(';');
  const result: ParsedRule = { freq: 'DAILY', interval: 1 };

  for (const part of parts) {
    const [key, value] = part.split('=');
    switch (key) {
      case 'FREQ':
        result.freq = value as Frequency;
        break;
      case 'INTERVAL':
        result.interval = parseInt(value, 10) || 1;
        break;
      case 'BYDAY':
        result.byDay = value.split(',');
        break;
      case 'COUNT':
        result.count = parseInt(value, 10);
        break;
    }
  }

  return result;
}

const DAY_MAP: Record<string, number> = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

export function getNextOccurrence(rule: string, lastDate: Date): Date | null {
  const parsed = parseRRule(rule);
  if (!parsed) return null;

  const next = new Date(lastDate);

  switch (parsed.freq) {
    case 'DAILY':
      next.setDate(next.getDate() + parsed.interval);
      break;
    case 'WEEKLY':
      if (parsed.byDay && parsed.byDay.length > 0) {
        const currentDay = next.getDay();
        const targetDays = parsed.byDay.map(d => DAY_MAP[d]).filter(d => d !== undefined).sort((a, b) => a - b);
        let found = false;
        for (const targetDay of targetDays) {
          if (targetDay > currentDay) {
            next.setDate(next.getDate() + (targetDay - currentDay));
            found = true;
            break;
          }
        }
        if (!found) {
          const daysUntilFirst = 7 * parsed.interval - currentDay + targetDays[0];
          next.setDate(next.getDate() + daysUntilFirst);
        }
      } else {
        next.setDate(next.getDate() + 7 * parsed.interval);
      }
      break;
    case 'MONTHLY':
      next.setMonth(next.getMonth() + parsed.interval);
      break;
    case 'YEARLY':
      next.setFullYear(next.getFullYear() + parsed.interval);
      break;
  }

  return next;
}

export function describeRRule(rule: string): string {
  const parsed = parseRRule(rule);
  if (!parsed) return '';

  const DAY_NAMES: Record<string, string> = { SU: 'Sun', MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat' };

  switch (parsed.freq) {
    case 'DAILY':
      return parsed.interval === 1 ? 'Daily' : `Every ${parsed.interval} days`;
    case 'WEEKLY':
      const days = parsed.byDay?.map(d => DAY_NAMES[d] || d).join(', ') || '';
      return parsed.interval === 1
        ? days ? `Weekly on ${days}` : 'Weekly'
        : `Every ${parsed.interval} weeks${days ? ` on ${days}` : ''}`;
    case 'MONTHLY':
      return parsed.interval === 1 ? 'Monthly' : `Every ${parsed.interval} months`;
    case 'YEARLY':
      return parsed.interval === 1 ? 'Yearly' : `Every ${parsed.interval} years`;
  }
}
