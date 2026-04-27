'use client';

/**
 * DeleteEnvironmentTrigger — small "Delete" button that opens the
 * full DeleteEnvironmentModal.
 *
 * Drop-in replacement for `<DeleteButton type="environments" />`.
 * Lives in its own component so the modal's fetch + state machinery
 * is lazy — only mounted when the user actually clicks.
 */

import { useState } from 'react';
import DeleteEnvironmentModal from './DeleteEnvironmentModal';

type Props = {
  id: string;
  name: string;
  redirectTo?: string;
  /** Mirrors DeleteButton's "Delete?" inline prompt look. */
  variant?: 'subtle' | 'danger';
};

export default function DeleteEnvironmentTrigger({
  id,
  name,
  redirectTo,
  variant = 'subtle',
}: Props) {
  const [open, setOpen] = useState(false);

  const baseStyle =
    variant === 'danger'
      ? { color: 'var(--danger, #FF6B6B)' }
      : { color: 'var(--text-3)' };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-light transition-colors hover:opacity-80"
        style={baseStyle}
      >
        Delete
      </button>
      {open && (
        <DeleteEnvironmentModal
          environmentId={id}
          environmentName={name}
          redirectTo={redirectTo}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
