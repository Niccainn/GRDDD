import { getAuthIdentity } from '@/lib/auth';
import { rateLimitApi } from '@/lib/rate-limit';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';
import { fireWebhooks } from '@/lib/webhooks';
import { audit } from '@/lib/audit';
import { computeHealthScore } from '@/lib/health';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ExecuteEvent =
  | { type: 'stage_start'; stage: string; index: number }
  | { type: 'stage_text'; text: string }
  | { type: 'stage_done'; index: number; output: string }
  | { type: 'done'; executionId: string; tokens: number }
  | { type: 'error'; message: string };

export async function POST(req: NextRequest) {
  const identity = await getAuthIdentity();
  const rl = rateLimitApi(identity.id);
  if (!rl.allowed) return Response.json({ error: 'Rate limited' }, { status: 429 });
  const { executionId, workflowId, systemId, input, stages } = await req.json();

  if (!executionId || !input || !systemId) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), { status: 500 });
  }

  const [system, workflow] = await Promise.all([
    prisma.system.findUnique({
      where: { id: systemId },
      include: { environment: true },
    }),
    workflowId
      ? prisma.workflow.findUnique({ where: { id: workflowId } })
      : Promise.resolve(null),
  ]);

  if (!system) return new Response(JSON.stringify({ error: 'System not found' }), { status: 404 });

  const workflowStages: string[] = stages ?? (workflow ? JSON.parse(workflow.stages ?? '[]') : []);

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      function send(event: ExecuteEvent) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      try {
        let totalTokens = 0;
        const stageOutputs: { stage: string; output: string }[] = [];

        if (workflowStages.length === 0) {
          // No stages — just do a single analysis pass
          send({ type: 'stage_start', stage: 'Analysis', index: 0 });

          const systemPrompt = `You are Nova, operating inside the ${system.name} system (${system.environment.name}).
Your job is to process and respond to work requests with actionable, specific output.
Be direct. Produce real work — not descriptions of work.`;

          const stream = anthropic.messages.stream({
            model: 'claude-opus-4-6',
            max_tokens: 1500,
            system: systemPrompt,
            messages: [{ role: 'user', content: input }],
          });

          let stageOut = '';
          stream.on('text', t => { stageOut += t; send({ type: 'stage_text', text: t }); });
          const final = await stream.finalMessage();
          totalTokens += final.usage.input_tokens + final.usage.output_tokens;
          send({ type: 'stage_done', index: 0, output: stageOut });
          stageOutputs.push({ stage: 'Analysis', output: stageOut });
        } else {
          // Process each stage sequentially
          for (let i = 0; i < workflowStages.length; i++) {
            const stage = workflowStages[i];
            send({ type: 'stage_start', stage, index: i });

            const previousContext = stageOutputs.length > 0
              ? `\n\nPrevious stages completed:\n${stageOutputs.map(s => `**${s.stage}:**\n${s.output}`).join('\n\n---\n\n')}`
              : '';

            const systemPrompt = `You are Nova, an AI operations engine inside ${system.name} (${system.environment.name}).
You produce real, concrete work output — not descriptions of work. Each stage must deliver a complete, usable artifact.
Use markdown formatting. Be thorough but focused. Write as a senior professional would.`;

            // Stage-specific instructions for richer output
            const stageInstructions: Record<string, string> = {
              'Research': 'Conduct thorough research. Deliver: key findings, target audience insights, competitive landscape, 5-8 data points or statistics, and recommended angle. Format as a structured brief.',
              'Draft': 'Write the complete draft using insights from the Research stage. Deliver the full text — not an outline. Use clear structure with headers, engaging opening, substantive body, and strong conclusion. Target 1500-2000 words.',
              'Review': 'Review the Draft for quality, clarity, brand alignment, and impact. Deliver: a quality score (1-10), specific strengths, specific issues to fix, suggested edits with before/after, and SEO recommendations.',
              'Publish': 'Prepare the final publication package. Deliver: optimized title tag (60 chars), meta description (155 chars), 3 social media share variants (Twitter, LinkedIn, Instagram), suggested publish date/time, and target keywords.',
              'Discovery': 'Conduct a thorough discovery analysis. Identify requirements, constraints, stakeholders, risks, and success criteria. Deliver a structured discovery document.',
              'Setup': 'Design the setup and configuration plan. Deliver: step-by-step setup checklist, resource requirements, timeline, and dependencies.',
              'Training': 'Create a training plan. Deliver: learning objectives, session outlines, key materials needed, and success metrics.',
              'Handoff': 'Prepare the handoff package. Deliver: summary of work completed, open items, documentation links, and next steps for the receiving team.',
              'Brief': 'Create a comprehensive creative brief. Deliver: objectives, target audience, key messages, tone/voice, deliverables list, timeline, and budget estimate.',
              'Creative': 'Develop the creative concepts. Deliver: 2-3 concept directions with rationale, headline options, visual direction notes, and recommended approach.',
              'Launch': 'Plan the launch execution. Deliver: launch checklist, channel distribution plan, timing strategy, and success metrics to track.',
              'Measure': 'Define the measurement framework. Deliver: KPIs, tracking setup requirements, reporting cadence, and optimization triggers.',
              'Planning': 'Run sprint planning. Deliver: sprint goal, prioritized backlog items with estimates, capacity allocation, and risk flags.',
              'Development': 'Track development progress. Deliver: completed items summary, in-progress status, blockers, and velocity assessment.',
              'Deploy': 'Prepare deployment. Deliver: deployment checklist, rollback plan, monitoring alerts to set, and stakeholder communication.',
              'Proposal': 'Create the design proposal. Deliver: problem statement, proposed solution with rationale, visual references, and scope definition.',
              'Critique': 'Conduct design critique. Deliver: assessment against design principles, usability concerns, accessibility check, and prioritized improvement list.',
              'Iterate': 'Plan design iterations. Deliver: specific changes to make based on critique, updated specifications, and revised timeline.',
              'Approve': 'Prepare for approval. Deliver: final design summary, changes made since proposal, compliance checklist, and implementation handoff notes.',
              'Data Collection': 'Gather and organize relevant data. Deliver: data sources identified, collection methodology, quality assessment, and initial findings.',
              'Analysis': 'Analyze the collected data. Deliver: key insights, trends, anomalies, statistical summaries, and actionable conclusions.',
              'Report': 'Write the formal report. Deliver: executive summary, detailed findings, visualizations described, and strategic recommendations.',
              'Present': 'Prepare the presentation. Deliver: slide deck outline, key talking points per slide, anticipated questions with answers, and call-to-action.',
            };

            const specificInstruction = stageInstructions[stage] ?? `Process the **${stage}** stage. Produce the actual output/deliverable.`;

            const stagePrompt = `Workflow: ${workflow?.name ?? 'Custom run'}
Current stage: **${stage}** (${i + 1} of ${workflowStages.length})
${previousContext}

---

Original request:
${input}

---

**${stage} stage instructions:**
${specificInstruction}`;

            const stream = anthropic.messages.stream({
              model: 'claude-sonnet-4-6',
              max_tokens: 2500,
              system: systemPrompt,
              messages: [{ role: 'user', content: stagePrompt }],
            });

            let stageOut = '';
            stream.on('text', t => { stageOut += t; send({ type: 'stage_text', text: t }); });
            const final = await stream.finalMessage();
            totalTokens += final.usage.input_tokens + final.usage.output_tokens;
            stageOutputs.push({ stage, output: stageOut });
            send({ type: 'stage_done', index: i, output: stageOut });

            // Update execution progress in DB
            await prisma.execution.update({
              where: { id: executionId },
              data: {
                currentStage: i + 1,
                status: i + 1 >= workflowStages.length ? 'COMPLETED' : 'RUNNING',
                output: i + 1 >= workflowStages.length
                  ? JSON.stringify(stageOutputs)
                  : null,
                ...(i + 1 >= workflowStages.length ? { completedAt: new Date() } : {}),
              },
            });
          }
        }

        // Final persist
        const fullOutput = JSON.stringify(stageOutputs);
        await prisma.execution.update({
          where: { id: executionId },
          data: { status: 'COMPLETED', output: fullOutput, completedAt: new Date() },
        });

        // Validation scoring
        try {
          const validationPrompt = `You are a quality evaluator. Score this workflow execution output.

Input request: ${input}
Stages completed: ${stageOutputs.map(s => s.stage).join(', ')}

Output produced:
${stageOutputs.map(s => `**${s.stage}:**\n${s.output}`).join('\n\n')}

Return JSON only (no markdown):
{
  "score": <0.0-1.0 float>,
  "issues": ["<issue1>", "<issue2>"],
  "summary": "<one sentence assessment>"
}

Score 1.0 = complete, coherent, actionable. Score 0.0 = missing, vague, or unusable.`;

          const validationRes = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 512,
            messages: [{ role: 'user', content: validationPrompt }],
          });

          const rawText = validationRes.content.find(b => b.type === 'text')?.text ?? '{}';
          const cleaned = rawText.replace(/```json\n?|\n?```/g, '').trim();
          const parsed = JSON.parse(cleaned);

          await prisma.validationResult.create({
            data: {
              executionId,
              score: Math.max(0, Math.min(1, parsed.score ?? 0.5)),
              issues: JSON.stringify(parsed.issues ?? []),
              correctedOutput: parsed.summary ?? null,
            },
          });
        } catch { /* validation is best-effort */ }

        // Log to intelligence
        if (identity) {
          await prisma.intelligenceLog.create({
            data: {
              action: 'workflow_execution',
              input: JSON.stringify({ input, stages: workflowStages }),
              output: fullOutput,
              tokens: totalTokens,
              success: true,
              systemId,
              identityId: identity.id,
              ...(workflowId ? { workflowId } : {}),
              intelligenceId: (
                await prisma.intelligence.findFirst({ where: { systemId, name: 'Nova' } }) ??
                await prisma.intelligence.create({
                  data: { type: 'AI_AGENT', name: 'Nova', systemId, environmentId: system.environmentId, creatorId: identity.id },
                })
              ).id,
            },
          });
        }

        // Audit completion
        audit({
          action: 'execution.completed',
          entity: 'Execution',
          entityId: executionId,
          entityName: workflowId ? 'Workflow Execution' : 'Execution',
          metadata: { tokens: totalTokens, stages: workflowStages },
          environmentId: system.environmentId,
        });

        // Fire webhook for completed execution
        fireWebhooks('execution.completed', {
          executionId,
          systemId,
          workflowId: workflowId ?? null,
          input,
          stages: stageOutputs.map(s => s.stage),
          tokens: totalTokens,
        }, system.environmentId).catch(() => {});

        // Recompute health score after execution
        computeHealthScore(systemId).then(score => {
          if (score !== null) prisma.system.update({ where: { id: systemId }, data: { healthScore: score } }).catch(() => {});
        }).catch(() => {});

        send({ type: 'done', executionId, tokens: totalTokens });
      } catch (err) {
        // Fire webhook for failed execution
        fireWebhooks('execution.failed', {
          executionId,
          systemId,
          workflowId: workflowId ?? null,
          error: err instanceof Error ? err.message : 'Unknown error',
        }, system.environmentId).catch(() => {});
        send({ type: 'error', message: err instanceof Error ? err.message : 'Execution failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
