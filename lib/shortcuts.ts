export type Shortcut = {
  key: string;
  label: string;
  section: string;
  action: () => void;
};

export type ShortcutDef = Omit<Shortcut, 'action'>;

export const shortcutDefs: ShortcutDef[] = [
  // Navigation (g + key)
  { key: 'g h', label: 'Go to Home', section: 'Navigation' },
  { key: 'g t', label: 'Go to Tasks', section: 'Navigation' },
  { key: 'g n', label: 'Go to Nova', section: 'Navigation' },
  { key: 'g w', label: 'Go to Workflows', section: 'Navigation' },
  { key: 'g e', label: 'Go to Environments', section: 'Navigation' },
  { key: 'g i', label: 'Go to Inbox', section: 'Navigation' },
  { key: 'g s', label: 'Go to Settings', section: 'Navigation' },
  { key: 'g f', label: 'Go to Finance', section: 'Navigation' },
  { key: 'g d', label: 'Go to Documents', section: 'Navigation' },

  // Actions
  { key: 'c', label: 'Create new task', section: 'Actions' },
  { key: '?', label: 'Show shortcuts help', section: 'Actions' },

  // Global
  { key: '\u2318 k', label: 'Command palette', section: 'Global' },
  { key: 'Escape', label: 'Close modals', section: 'Global' },
];

/** Group shortcut defs by section, preserving order */
export function groupedShortcuts(): Record<string, ShortcutDef[]> {
  const groups: Record<string, ShortcutDef[]> = {};
  for (const s of shortcutDefs) {
    if (!groups[s.section]) groups[s.section] = [];
    groups[s.section].push(s);
  }
  return groups;
}
