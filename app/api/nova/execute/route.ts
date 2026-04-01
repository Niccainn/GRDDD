import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/db';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type ExecuteEvent =
  | { type: 'stage_start'; stage: string; index: number }
  | { type: 'stage_text'; text: string }
  | { type: 'stage_done'; index: number; output: string }
  | { type: 'done'; executionId: string; tokens: number }
  | { type: 'error'; message: string };

export async function POST(req: NextRequest) {
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
You are processing a workflow stage by stage. Produce concrete, specific output for each stage.
Do not explain what you're doing — just do it. Be concise but complete.`;

            const stagePrompt = `Workflow: ${workflow?.name ?? 'Custom run'}
Current stage: **${stage}** (${i + 1} of ${workflowStages.length})
${previousContext}

---

Original request:
${input}

---

Process the **${stage}** stage now. Produce the actual output/deliverable for this stage.`;

            const stream = anthropic.messages.stream({
              model: 'claude-opus-4-6',
              max_tokens: 1200,
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
        const identity = await prisma.identity.findFirst({ where: { email: 'demo@grid.app' } });
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

        send({ type: 'done', executionId, tokens: totalTokens });
      } catch (err) {
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
