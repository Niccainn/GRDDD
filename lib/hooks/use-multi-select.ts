/**
 * useMultiSelect — state hook for list pages that want shift-click
 * + checkbox-style multi-selection. Parent pages pass the ordered
 * id list; the hook returns selection state and helpers.
 *
 *   const { selected, isSelected, toggle, clear, selectAll } = useMultiSelect(orderedIds);
 *
 * shift-click on an id selects the range from the last-clicked id
 * to the new one. `clear` is bound to Escape at the page level via
 * the BulkActionBar — the hook doesn't need to own that.
 */

import { useCallback, useState } from 'react';

export function useMultiSelect(orderedIds: string[]) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const isSelected = useCallback(
    (id: string) => selected.has(id),
    [selected],
  );

  const toggle = useCallback(
    (id: string, shift = false) => {
      setSelected(prev => {
        const next = new Set(prev);
        if (shift && lastClicked && lastClicked !== id) {
          const a = orderedIds.indexOf(lastClicked);
          const b = orderedIds.indexOf(id);
          if (a >= 0 && b >= 0) {
            const [from, to] = a < b ? [a, b] : [b, a];
            for (let i = from; i <= to; i++) next.add(orderedIds[i]);
            setLastClicked(id);
            return next;
          }
        }
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setLastClicked(id);
        return next;
      });
    },
    [lastClicked, orderedIds],
  );

  const clear = useCallback(() => {
    setSelected(new Set());
    setLastClicked(null);
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(orderedIds));
  }, [orderedIds]);

  return {
    selected,
    count: selected.size,
    isSelected,
    toggle,
    clear,
    selectAll,
  };
}
