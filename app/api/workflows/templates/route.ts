import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { redirect } from 'next/navigation';

const WORKFLOW_TEMPLATES = [
  {
    id: 'content-pipeline',
    name: 'Content Pipeline',
    description: 'End-to-end content creation and publishing flow',
    stages: ['Brief', 'Research', 'Draft', 'Review', 'Edit', 'Approve', 'Publish'],
    category: 'Content',
    color: '#68D0CA',
  },
  {
    id: 'client-onboarding',
    name: 'Client Onboarding',
    description: 'Structured intake and setup process for new clients',
    stages: ['Discovery', 'Proposal', 'Sign-off', 'Kickoff', 'Setup', 'Handoff'],
    category: 'Client',
    color: '#7193ED',
  },
  {
    id: 'product-launch',
    name: 'Product Launch',
    description: 'Coordinated go-to-market sequence',
    stages: ['Strategy', 'Build', 'QA', 'Soft Launch', 'Marketing Push', 'Review'],
    category: 'Product',
    color: '#F7C700',
  },
  {
    id: 'hiring-pipeline',
    name: 'Hiring Pipeline',
    description: 'Candidate evaluation and hiring process',
    stages: ['Sourcing', 'Screen', 'Interview 1', 'Interview 2', 'Offer', 'Onboard'],
    category: 'People',
    color: '#BF9FF1',
  },
  {
    id: 'sprint-cycle',
    name: 'Sprint Cycle',
    description: 'Two-week development sprint with review gates',
    stages: ['Planning', 'Development', 'Code Review', 'QA', 'Demo', 'Retrospective'],
    category: 'Engineering',
    color: '#C8F26B',
  },
  {
    id: 'campaign',
    name: 'Marketing Campaign',
    description: 'Campaign planning through to performance analysis',
    stages: ['Ideation', 'Targeting', 'Creative', 'Launch', 'Monitor', 'Report'],
    category: 'Marketing',
    color: '#FF9F7F',
  },
];

export async function GET() {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  return Response.json(WORKFLOW_TEMPLATES);
}

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { templateId, systemId, environmentId } = await req.json();
  const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
  if (!template) return Response.json({ error: 'Template not found' }, { status: 404 });

  const workflow = await prisma.workflow.create({
    data: {
      name: template.name,
      description: template.description,
      status: 'DRAFT',
      systemId,
      environmentId,
      creatorId: identity.id,
      stages: JSON.stringify(template.stages),
    },
  });

  return Response.json({ id: workflow.id });
}
