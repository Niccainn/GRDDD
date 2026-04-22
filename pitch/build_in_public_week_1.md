# Build in public, week 1 — what GRID shipped

*This is the first of a weekly log. GRID runs on GRID; every Monday the
Environment page writes a narrative like this one about itself. We're posting
ours publicly because the product's whole thesis is that work should be
legible.*

## The thesis, restated

Every company has three AI problems nobody sells a cure for:

1. People sabotage rollouts they don't trust.
2. CFOs can't tell if any of it is working.
3. New users don't know what they want.

We think the cure is a **nervous system** — a substrate that reads your
company, acts with your permission, and proves its work. Not a dashboard, not
a chatbot, not another workflow builder. Something underneath all three.

## What shipped this week

- **Meetings on the calendar.** Native Meeting model, Task/Meeting switcher
  in the quick-add, pink pills on the month view, Event drawer with
  Google / Outlook / `.ics` export. Meetings are the last thing still in a
  separate tool for most teams; we brought them inside.
- **Team invitations end to end.** EnvironmentInvitation model,
  token-hashed email invites via Resend, accept flow that routes through
  sign-up for new users. Roles: Owner, Admin, Contributor, Viewer. Revoke
  and remove work in real time.
- **Environments, editable and deletable everywhere.** Rename and delete
  inline on the list, in the detail header, in the sidebar. Deleting an
  Environment cascades: its Systems and Workflows vanish from every surface
  live, not on next page load. Event-driven sync via
  `grid:{entity}-changed` events.
- **Documents, properly deletable.** Replaced the emoji icons with
  brand-colored circles keyed to the document's environment. Switched the
  delete API from soft-archive to a real hard delete with cascading
  children. No more stale notes.
- **Department widget catalog.** A typed preset list per department (Brand,
  Marketing, Operations, Finance, Design, Development, General) with
  recommended defaults. Each preset is toggleable — user picks what shows
  on their Environment page; picks persist per user, per system.
- **Hideable panels on the System page.** Every right-rail panel can be
  hidden with a hover × and restored from the chip at the top. Stays in
  sync with the onboarding widget picker so selections carry through.

## What we believe now that we didn't at the start of the week

- **Live sync across surfaces is the foundation, not a polish pass.** Every
  sabotage story we heard from users traced back to "I deleted it and it
  kept showing up." Invisible deletes break trust in a way no onboarding
  flow can recover.
- **Dept-native presets matter more than a universal template.** Finance
  people do not want the marketing dashboard with the colors changed. The
  same substrate, six viewing angles, is the correct shape.
- **Removability is as important as configurability.** A Finance lead who
  hides the "content engine" panel trusts the tool more than one who's
  told to ignore it.

## What we're working on next

- **The Environment page becomes the canonical artifact.** One honest
  headline number, an exceptions feed, a Nova-written Monday narrative,
  and a live action ledger. Screenshot-worthy by design.
- **Onboarding becomes an interview, not a prompt.** Five questions, then
  Nova proposes the Systems / Goals / Workflows it heard. The blank-page
  problem is the biggest activation failure in AI products; we're killing
  it.
- **The trust layer becomes visible.** "Why did Nova do this?" on every
  autonomous action. Per-team adoption telemetry. Reversible-by-default
  with a one-click undo window.
- **Anthropic partnership brief is out.** GRID is the first reference
  business-OS on Claude.

## The artifact

If you want to see what a nervous system for a company looks like, the
product is live. Ask for an invite and run your own Monday narrative next
week.

—

*Posted on behalf of the GRID team. The weekly narrative format used above is
the same one the product generates for every Environment on Monday morning.*
