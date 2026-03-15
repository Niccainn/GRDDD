import { prisma } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import Navigation from '@/components/Navigation';
import WorkflowEditor from '@/components/workflow/WorkflowEditor';

async function getWorkflow(id: string) {
  return await prisma.workflow.findUnique({
    where: { id },
    include: { system: true, environment: true }
  });
}

async function updateWorkflow(formData: FormData) {
  'use server';
  const id = formData.get('id') as string;
  const nodes = formData.get('nodes') as string;
  const edges = formData.get('edges') as string;
  const status = formData.get('status') as string;
  
  await prisma.workflow.update({
    where: { id },
    data: { 
      nodes, 
      edges,
      ...(status && { status })
    }
  });
  
  redirect(`/workflows/${id}/edit`);
}

export default async function WorkflowEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const workflow = await getWorkflow(id);
  if (!workflow) notFound();
  
  return (
    <div className="min-h-screen bg-[#121213] text-white">
      <Navigation />
      <WorkflowEditor workflow={workflow} updateWorkflow={updateWorkflow} />
    </div>
  );
}
