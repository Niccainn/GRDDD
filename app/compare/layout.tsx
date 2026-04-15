import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compare GRID to Other Platforms',
  description: 'See how GRID stacks up against Notion, Monday.com, ClickUp, Asana, and other work management tools.',
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
