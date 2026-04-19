# GRID — 5-Minute Quickstart

The shortest path from "never seen GRID" to "I have a working cell
and ran my first workflow."

**Total time: ~5 minutes. Cost: $0 (BYOK key optional but recommended).**

## What you need open

- A browser
- Your Anthropic API key — grab at https://console.anthropic.com/settings/keys (skip and come back if you don't have one yet)

## Step 1 — Sign up (60 sec)

1. Visit **https://grddd.com**
2. Click **Get early access**
3. Name, email, 12+ char password, tick Terms → **Create workspace**

## Step 2 — Onboarding (90 sec)

4. Name yourself, role is optional → **Continue**
5. Name your workspace (any label — you can rename later) → **Continue**
6. Pick **Start fresh** → **Continue**
7. Skip brand voice (optional, set it later) → **Continue**
8. Pick **Solo builder** template → **Enter GRID**

You're on the dashboard. Three systems (Marketing, Operations, Product) with starter workflows are pre-created.

## Step 3 — Connect your Anthropic key (60 sec)

9. Open Settings → **AI** (or visit `/settings/ai`)
10. Paste your `sk-ant-...` key → **Connect**
11. Nova validates the key with a 1-token ping; you see "sk-ant-...XXXX" confirmation

> Without this step, Nova will refuse to run. Your key stays encrypted at rest — never in plaintext in our DB or logs.

## Step 4 — Run your first workflow (90 sec)

12. Sidebar → **YOUR SYSTEMS** → click **Marketing**
13. You see the starter **Marketing Pipeline** workflow. Click it.
14. Click the **▶ Run** button at the top
15. Type a short input like: *"Draft a post about our spring launch"*
16. Watch the stages execute — output appears below

## Step 5 — Close the loop (60 sec)

17. When the workflow finishes, click **Review this run**
18. Give it a star rating and one-line feedback
19. That's Nova's learning signal. It will use this for every future run of the same workflow

## You did it

You have:
- A workspace with real systems
- A working Nova connection
- A completed workflow run with an attached review
- A growing MasteryInsight record that makes Nova better next time

## What next

- **Connect a real integration** — `/integrations`, pick Notion or Slack, click Connect. Data starts flowing in 15 min.
- **Try scaffolding** — delete the starter systems, then use the scaffold widget on the dashboard with a sentence about your actual team
- **Read the full walkthrough** — `docs/USER_GUIDE.md` covers every feature
- **Ask Nova** — click the Nova bar at the bottom-right and ask anything. It has workspace context.

## If something doesn't work

- Password reset didn't arrive → check spam, then `docs/TROUBLESHOOTING.md`
- Nova error "Connect your Anthropic account" → you skipped step 10; go back
- Integration won't connect → the operator may not have configured the OAuth app yet. See `docs/INTEGRATIONS_SETUP.md`
- Anything else → Nova bar at bottom-right: *"I'm stuck — what should I do?"*

---

**Feedback loop**: if this quickstart took you more than 5 minutes, please tell the team — we'll cut whichever step cost you time.
