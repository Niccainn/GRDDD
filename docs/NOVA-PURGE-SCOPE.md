# Nova → Atrium Internal Rename Scope
*Generated 2026-05-15 — read-only scope audit*

## TL;DR

- **776 case-insensitive references** in the repo: 330 `Nova`, 446 `nova`
- **Risk: HIGH** — touches database schema, API routes, env vars, billing metrics, brand docs
- **Effort: 4-5 hours code + 15 min maintenance window for DB migration**
- **Sequence: 5 coordinated PRs across 1-3 weeks** (or compress to one push if accepting more risk)

## Reference breakdown

| Category | Count | Risk | Notes |
|---|---|---|---|
| Directories + files | 8 | TRIVIAL | `app/nova/`, `lib/nova/`, `app/api/nova/`, `__tests__/nova-eval/`, etc. |
| Code identifiers (functions, types, classes) | 50 | TRIVIAL | `runNovaAgent`, `rateLimitNova`, `NovaEvent`, etc. |
| Prisma models + columns | 4 | CAREFUL | `NovaMemory`, `NovaReflection`, `System.novaRouting`, `System.novaTriaged` |
| Prisma enum values | 5+ | CAREFUL | `nova_queries`, `nova_query`, `nova_observation`, `nova.memory_updated`, etc. |
| API routes (breaking) | 10 | MEDIUM | All `/api/nova/*` move to `/api/atrium/*` |
| Environment variables | 5 | CAREFUL | `NOVA_TOOLS_LIVE`, `NOVA_EVAL_URL`, `NOVA_EVAL_COOKIE` (+Vercel update) |
| Billing metric keys | 2 | CAREFUL | `nova_queries` → `atrium_queries`; `nova_query` → `atrium_query` (must handle both during transition) |
| User-facing strings | 16 | TRIVIAL-MEDIUM | Labels, page titles, tooltips |
| Documentation | 199 (21 files) | MEDIUM | Brand guidelines, user guide, phase docs, README |

## Filesystem renames (PR #101 — TRIVIAL)

```
app/nova/                                       → app/atrium/
app/api/nova/                                   → app/api/atrium/
app/api/systems/[id]/nova-config/               → app/api/systems/[id]/atrium-config/
lib/nova/                                       → lib/atrium/
lib/nova.ts                                     → lib/atrium.ts
lib/seed-nova-memories.ts                       → lib/seed-atrium-memories.ts
lib/kernel/prompts/nova-chat.ts                 → lib/kernel/prompts/atrium-chat.ts
__tests__/nova-eval/                            → __tests__/atrium-eval/
```

## Code identifier renames (PR #101 — TRIVIAL)

| Old | New | Files |
|---|---|---|
| `runNovaAgent()` | `runAtriumAgent()` | lib/nova.ts + 2 routes |
| `rateLimitNova()` | `rateLimitAtrium()` | lib/rate-limit.ts + 2 callers |
| `rateLimitNovaStrict()` | `rateLimitAtriumStrict()` | lib/rate-limit.ts + 8 callers |
| `getNovaLogs()` | `getAtriumLogs()` | app/nova/page.tsx |
| `getOrCreateNovaIntelligence()` | `getOrCreateAtriumIntelligence()` | 2 analytics routes |
| `seedNovaMemories()` | `seedAtriumMemories()` | seed script |
| `buildNovaChatPrompt()` | `buildAtriumChatPrompt()` | kernel prompts |
| `triageWithNova()` | `triageWithAtrium()` | components/environments/WhyDrawer.tsx |
| `runWithNova()` | `runWithAtrium()` | app/executions/[id]/page.tsx |
| `NovaEvent` | `AtriumEvent` | 3 files |
| `NovaChatPromptInput` | `AtriumChatPromptInput` | 1 file |
| `NovaAction` | `AtriumAction` | 1 file |
| `NovaLog` | `AtriumLog` | 2 components |
| `prisma.novaMemory.*` | `prisma.atriumMemory.*` | 5+ files |
| `prisma.novaReflection.*` | `prisma.atriumReflection.*` | 1 file |

## Database migration (PR #103 — CAREFUL, requires maintenance window)

Prisma schema changes:
- `NovaMemory` model → `AtriumMemory` (table `nova_memory` → `atrium_memory`)
- `NovaReflection` model → `AtriumReflection` (table `nova_reflection` → `atrium_reflection`)
- `System.novaRouting` → `System.atriumRouting`
- `System.novaTriaged` → `System.atriumTriaged`

SQL migration:
```sql
ALTER TABLE nova_memory RENAME TO atrium_memory;
ALTER TABLE nova_reflection RENAME TO atrium_reflection;
ALTER TABLE system RENAME COLUMN novaRouting TO atriumRouting;
ALTER TABLE system RENAME COLUMN novaTriaged TO atriumTriaged;

UPDATE intelligence_log SET metric = 'atrium_queries'        WHERE metric = 'nova_queries';
UPDATE intelligence_log SET action = 'atrium_query'          WHERE action = 'nova_query';
UPDATE intelligence_log SET action = 'atrium_insight'        WHERE action = 'nova_insight';
UPDATE intelligence_log SET action = 'atrium.memory_updated' WHERE action = 'nova.memory_updated';
UPDATE atrium_memory     SET source = 'atrium_observation'   WHERE source = 'nova_observation';
```

Deploy sequence:
1. Announce 15-min maintenance window
2. Deploy code from #101 + #102
3. Run migration (~1-2 min)
4. Verify zero errors via `check:integrations` and a smoke test
5. Resume service

Rollback: Keep DB backup; reverse SQL is symmetric.

## Environment variables (PR #102 — CAREFUL, requires Vercel update)

| Old | New | Where |
|---|---|---|
| `NOVA_TOOLS_LIVE` | `ATRIUM_TOOLS_LIVE` | app/nova/page.tsx, lib/nova.ts |
| `NOVA_EVAL_URL` | `ATRIUM_EVAL_URL` | __tests__/nova-eval/harness.test.ts |
| `NOVA_EVAL_COOKIE` | `ATRIUM_EVAL_COOKIE` | docs/TESTS.md |

Each must also be updated in Vercel Production + Preview env scopes.

## API route renames (PR #102 — MEDIUM, breaking)

```
/api/nova                              → /api/atrium
/api/nova/action/[id]                  → /api/atrium/action/[id]
/api/nova/action/[id]/teach            → /api/atrium/action/[id]/teach
/api/nova/execute (maxDuration: 300)   → /api/atrium/execute (update vercel.json)
/api/nova/global                       → /api/atrium/global
/api/nova/logs                         → /api/atrium/logs
/api/nova/memory                       → /api/atrium/memory
/api/nova/memory/[id]                  → /api/atrium/memory/[id]
/api/nova/reflections                  → /api/atrium/reflections
/api/systems/[id]/nova-config          → /api/systems/[id]/atrium-config
```

User-facing route: `/nova` page → `/atrium` page.

## Documentation updates (PR #104 — MEDIUM)

Heavy:
- `PHASE_4_NOVA_BAR.md` → `PHASE_4_ATRIUM_BAR.md`
- `docs/BRAND_GUIDELINES.md` — capitalisation rules
- `docs/USER_GUIDE.md` — every UI label
- `docs/PRODUCT_SYNC.md` — product framing
- `docs/DESIGN_IDENTITY.md` — design rationale

Historical (keep but footnote):
- `PHASE_1_CUT.md`, `PHASE_2_ONBOARDING.md`, `PHASE_3_COCKPIT.md`, `PHASE_5_SYSTEM_PAGES.md`
- `CHANGELOG.md`, `README.md`, `SECURITY.md`

Recommended footnote: *"Previously called Nova; renamed in v2.0."*

## Recommended PR sequence

| PR | Scope | Risk | When |
|---|---|---|---|
| **#101** | Code refactor: directories, files, identifiers, types, components | TRIVIAL | Week 1 |
| **#102** | API routes + env vars + Vercel config | MEDIUM | Week 1 (after #101 verified) |
| **#103** | DB migration + Prisma schema + metric backfill | CAREFUL | Week 2 (15-min maintenance window) |
| **#104** | Documentation sweep (199 references across 21 files) | MEDIUM | Week 3 |
| **#105** | Analytics verification (operational, not a code PR) | LOW | Week 3 |

Alternative: compress #101-104 into one mega-PR if accepting higher risk + longer review cycle.

## Verification — zero remaining `Nova|nova` references

```bash
# Should return nothing (excluding historical comments in docs/):
grep -r "Nova" \
  --include="*.ts" --include="*.tsx" --include="*.js" --include="*.prisma" --include="*.json" \
  --exclude-dir=node_modules --exclude-dir=docs \
  . | grep -v "//" | grep -v "^.*:.*//.*Nova"

# Should return nothing:
grep -r "nova_" \
  --include="*.ts" --include="*.tsx" --include="*.prisma" \
  --exclude-dir=node_modules \
  .

# Should return nothing:
find ./app/api -type d -name "*nova*"
find ./app -type d -name "*nova*"
ls ./lib/nova* 2>/dev/null
```

## Total effort summary

| Item | Count | Effort | PR |
|---|---|---|---|
| Directories + files | 8 | 15 min | #101 |
| Code identifiers | 50 | 30 min | #101 |
| React components | 5 | 10 min | #101 |
| Comments/docstrings | 16 | 15 min | #101 |
| API routes | 10 | 20 min | #102 |
| Env vars | 5 | 15 min | #102 |
| Prisma models + cols | 4 | 20 min | #103 |
| Metric/enum values | 5+ | 30 min | #103 |
| Markdown docs | 199 | 2 hrs | #104 |
| **TOTAL** | **776 refs** | **~5 hrs + maintenance window** | **5 PRs** |
