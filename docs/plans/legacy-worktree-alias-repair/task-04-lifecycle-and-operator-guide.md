---
id: "04-lifecycle-and-operator-guide"
title: "Verify lifecycle recovery and document operation"
status: pending
wave: 4
depends_on:
  - "03-guard-runtime-identity"
plan: "plan.md"
requirements:
  - REQ-TASKS-WORKTREE-INVENTORY-REPAIR-002
  - REQ-TASKS-WORKTREE-INVENTORY-REPAIR-004
acceptance_criteria:
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-002.3
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-004.3
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-004.4
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-004.6
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-004.7
system_design:
  - ../../specs/tasks/system-design/worktree-inventory-repair.md
---

# Task 04: Verify lifecycle recovery and document operation

## Summary

Prove that the reusable repair restores normal archive and confirmed-delete
behavior after reopening storage. Publish the operator procedure with the
supported installation limits, refusal reasons, and rollback instructions.

## In scope

- Add generic real-Git/SQLite fixtures for same-root aliases and copied child
  environments. Exercise discover, preview, offline apply, verify, storage reopen,
  archive, and confirmed delete through the real lifecycle paths.
- Cover parent-only, child-only, and cascade actions on separate fixtures. Preserve
  a shared workspace with a retained borrower. Verify stable conversation/resume
  identity after rebinding, without launching an agent.
- Include healthy multi-branch controls and dirty tracked, staged, untracked,
  and ignored files. Repair preserves them, and subsequent delete keeps its
  existing consent and safety checks. Preserve cancelled old snapshots verbatim.
- Update `docs/public/git-operations.md`, linking from existing operations recovery
  guidance where useful. Explain source build, discovery/selection, fresh offline
  preview, process blockers, apply/verify/restart, and interrupted repair recovery.
- Synchronize the companion package links and this package's actual validation
  evidence. Keep existing completed work-order results intact.

## Out of scope

Running maintenance on this installation, deployment, binary distribution changes,
rendered UI changes, or claiming unsupported PostgreSQL/non-Linux application.

## Acceptance

1. `TestLegacyAliasLifecycle` proves archive/delete persistence after reopen for
   both incident shapes and proves that child removal preserves borrowed resources.
2. Content, commits, index, snapshots, and conversations survive metadata repair.
   Ordinary dirty/ownership/commit refusals remain intact.
3. The public how-to distinguishes an inventory repair from cleanup completion
   and states the supported platforms, offline requirement, and recovery commands.

## Verification

```bash
(cd apps/backend && go test -trimpath -race ./internal/task/service ./internal/task/handlers -run TestLegacyAliasLifecycle -count=1)
(cd apps/backend && go test -trimpath -race ./internal/task/inventoryrepair ./cmd/worktree-inventory-repair -count=1)
bash scripts/lint-go-changed apps/backend/internal/task/service/legacy_alias_lifecycle_test.go apps/backend/internal/task/handlers/legacy_alias_lifecycle_test.go
node --test scripts/validate-public-docs.test.mjs
node scripts/validate-public-docs.mjs
python3 scripts/list-docs.py validate
python3 scripts/lint-spec-files.test.py
python3 scripts/lint-spec-files.py --all
git diff --check
```

Include any additional fixture/helper files in the scoped lint invocation. Run the local
`validateCoverage` API from `.github/scripts/pr-docs.cjs` over the actual changed
files and their linked documents. Record all commands and results before marking
this package implemented. No generic full-backend or browser audit is added.

## Files likely touched

- New `apps/backend/internal/task/service/legacy_alias_lifecycle_test.go`.
- New `apps/backend/internal/task/handlers/legacy_alias_lifecycle_test.go`.
- Inventory-repair test helpers only where needed for reusable real fixtures.
- `docs/public/git-operations.md` and relevant links in `docs/public/operations.md`.
- The paired inventory-repair requirement/design, this package, and the companion
  `docs/plans/worktree-inventory-repair/plan.md` extension link.

## Dependencies

Tasks 01 through 03, including their complete targeted validation.

## Risks

A successful metadata verification does not prove that later cleanup completed.
Do not weaken file/ownership guards to obtain a successful end-to-end test.

## Parallelism

`sequential`

## Inputs

- Linked design's operator outcome and lifecycle matrix.
- Existing inventory-repair `cleanup_worker_test.go`, handoff service fixtures,
  HTTP delete confirmation tests, and public Git recovery instructions.

## Results

Pending.
