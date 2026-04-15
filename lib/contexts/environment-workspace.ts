'use client';
import { createContext, useContext } from 'react';

type EnvironmentWorkspaceContextType = {
  environmentId: string;
  slug: string;
  name: string;
  color: string | null;
  description: string | null;
};

const EnvironmentWorkspaceContext = createContext<EnvironmentWorkspaceContextType | null>(null);

export function useEnvironmentWorkspace() {
  const ctx = useContext(EnvironmentWorkspaceContext);
  if (!ctx) throw new Error('useEnvironmentWorkspace must be used within an EnvironmentWorkspaceProvider');
  return ctx;
}

export { EnvironmentWorkspaceContext };
export default EnvironmentWorkspaceContext;
