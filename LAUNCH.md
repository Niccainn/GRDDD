# GRID — Launch checklist & demo script

Last edit: this branch (`claude/charming-merkle-63f8c1`). Keep short. Update as you ship.

## Deploy checklist

Before routing traffic to a build from this branch:

1. **Apply migration 0011.** Adds Meeting intel columns, MeetingActionItem, Course/Module/Lesson/Quiz/Enrollment/LessonCompletion.
   ```bash
   npx prisma migrate deploy
   ```
   Non-negotiable. Without this, authenticated routes that touch Meeting or Course tables 500.

2. **Confirm env vars.**
   - `DATABASE_URL` — postgres connection string.
   - `ANTHROPIC_API_KEY` or per-env BYOK keys (see lib/nova/client-factory).
   - `NOVA_TOOLS_LIVE` — **leave unset / set to `0`** unless doing a sanctioned live-provider demo. When `1`, write-side tool calls (`postMessage`, `createPage`, etc.) actually fire. When `0`, they return simulated results.
   - `RESEND_API_KEY` — optional. Unset = auto-verify emails at signup, which is the right call for closed alpha.

3. **Sign-in smoke.** Sign in as a test user. `/environments/<slug>` should render the Glance strip and widget grid. No 500s in server logs.

4. **Tool-loop smoke (dry-run).** From `/projects`, create a project like "Post the weekly retro to Slack #general". Watch `/executions/<id>` — you should see `integration_list` or `slack_postMessage` invocations render with a `dry-run · policy` badge and a simulated response payload. No API traffic should leave the server.

5. **Meetings wedge smoke.** `/meetings` → Schedule meeting → Run intelligence. Transcript + summary + 3 action items appear. Click Promote on one → verify the resulting Task / Signal / Goal exists at its home route.

6. **Account-delete dry run.** `/settings` → Delete my account → type the confirmation. On a throwaway test identity verify the row is gone, session is revoked, and OAuth tokens for that identity's environments are removed.

7. **Tag the deploy.** Don't release the PR without a tag. We want git bisect to work.

## Demo script (design-partner walk)

Target: 10 minutes. Don't improvise — the surface is wide and drifts if you let it.

1. **Land on `/environments/<slug>`.** Point at the Glance strip. Say: "This is your environment at a glance — systems, workflows, open goals, open signals, running work, and last Nova action. Three clicks from here to anything."
2. **Project Launcher.** Type: *"Prep the weekly growth review and queue a Slack update in #growth when the doc's ready."* Let Nova generate a plan.
3. **Watch Execution detail.** As it streams, point out the TOOL INVOCATIONS block. Each live tool call shows live/dry-run badge, input, result, timing. Say: "This is the trust surface — Nova shows you what it read, what it decided, and what it would have done, all on one page."
4. **Meetings wedge.** `/meetings` → **Schedule meeting** (fill anything) → **Run intelligence**. Say: "This is the mock transcription. In production it's Whisper — the UI doesn't change." Show the transcript, summary, and three action items.
5. **Promote → Task.** Click **→ task** on one action item. Navigate to `/tasks`. The task is there with provenance back to the meeting.
6. **Courses (optional, skip if <15 min).** `/learn/courses` → open the sample course → walk one lesson → pass the quiz → note the skill-advancement hook.
7. **Close on trust.** `/settings` → Danger zone. Show the Delete account flow without executing. Say: "Hard delete, cascade, session revoke, under a minute. Nothing is retained unless you opt in."

**Don't demo:** analytics, reports, forms, portals, subprocessors, canvases, automations builder, agents, or any integration connect flow beyond Slack/Notion/GitHub/Figma. Those surfaces are shipped but thin and will dilute the wedge in a demo window.

## Design-partner success criteria

One of these three, verbatim, within 2 weeks of enrolling:

- "I keep opening GRID when a meeting ends."
- "The action-item promotion is what I actually needed from my ops tool."
- "I'd pay for this today."

If none of the three land within 2 weeks, the thesis is wrong and we narrow further — don't build more. If any land, double down on meetings → execution and rip the LMS surfaces off the sidebar.

## Known gaps (disclosed to design partners)

- **Live-tool writes are a global env flag, not a per-environment toggle.** Fixable but not before launch.
- **No approval UI yet.** Write-side tool calls are "plan and show" only; the one-click approve that turns a dry-run card into a live call is the next wedge commit.
- **~60 of 89 integrations are thin adapters.** Safe list for live demos: Slack, Notion, GitHub, Figma, Linear, HubSpot, Stripe (read-only), Meta Ads.
- **LMS surfaces (`/learn/courses`, `/learn/author`) ship but aren't promoted.** Routes work; no nav entry. Flip a chip back in when a customer pulls for it.
- **No automated test coverage on the tool loop or meeting wedge.** Manual smoke only.

## Voice reminders for customer-facing copy

Per CLAUDE.md:
- No "seamless," "unleash," "empower," "revolutionary."
- Short sentences, concrete nouns.
- Every feature earns its space by answering "why is this here?" in a line.
- When Nova acts, say what it read, what it decided, what it skipped.
- Honest theater only — if a progress bar is running, there's real work behind it.
