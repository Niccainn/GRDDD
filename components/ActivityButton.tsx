'use client';

/**
 * ActivityButton — small "Activity" text button that opens the
 * ActivitySheet for a given entity. Drop-in anywhere an object has
 * a detail page header (Environment, System, Workflow, Goal,
 * Project). Matches the visual weight of the other inline text
 * actions (Share / Rename / Delete).
 */

import { useState } from 'react';
import ActivitySheet from './ActivitySheet';

type Props = {
  entityType: string;
  entityId: string;
  entityLabel?: string;
};

export default function ActivityButton({ entityType, entityId, entityLabel }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs font-light transition-colors opacity-70 hover:opacity-100"
        style={{ color: 'var(--text-2)' }}
        aria-label="Show activity"
      >
        Activity
      </button>
      {open && (
        <ActivitySheet
          entityType={entityType}
          entityId={entityId}
          entityLabel={entityLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
