---
id: "03-guard-runtime-identity"
title: "Reject ambiguous runtime identity"
status: pending
wave: 3
depends_on:
  - "02-reconcile-shared-inventory"
plan: "plan.md"
requirements:
  - REQ-TASKS-WORKTREE-INVENTORY-REPAIR-004
acceptance_criteria:
  - AC-TASKS-WORKTREE-INVENTORY-REPAIR-004.8
system_design:
  - ../../specs/tasks/system-design/worktree-inventory-repair.md
---

# Task 03: Reject ambiguous runtime identity

## Summary

Make ordinary worktree authority reads and writes reject competing active
inventory slots. Prevent timestamp selection, unscoped `LIMIT 1`, and ID-based
updates from selecting or changing the wrong owner.

## In scope

- Add a typed ambiguity error at the worktree-store boundary and propagate it
  through existing admission/cleanup error paths without guessing a repair.
- Check slot identities independently from session joins. Preserve one active
  owner with deleted history, multiple sessions of one environment, inventory-only
  preparation rows, and distinct branch slots of the same repository.
- Audit ID-based writes in `worktree/store.go` and physical-ID persistence in
  `task_environment.go`. Address a single proven slot or refuse. Serialize new
  claims by physical ID, including concurrent PostgreSQL writers.
- Keep migrations and old databases bootable. Add no global unique index or
  automatic alias election. Do not alter session conversation or shared-group policy.

## Out of scope

Automatic repair, new UI controls, and changing immutable cleanup snapshots.

## Acceptance

1. `TestStoreAliasIdentity` and `TestTaskEnvironmentAliasIdentity` refuse ambiguous
   reads/writes and preserve every row, while healthy multi-session/history and
   multi-branch controls remain functional.
2. `TestPostgresAliasIdentity` proves concurrent conflicting physical claims cannot
   both commit. Run against a real PostgreSQL instance with `-race`.
3. Existing cleanup and recovery paths never translate ambiguity into absence,
   rematerialization, generic success, or an update of multiple claimants.

## Verification

```bash
test -n "${KANDEV_TEST_POSTGRES_DSN:-}"
(cd apps/backend && go test -trimpath -race ./internal/worktree -count=1)
(cd apps/backend && go test -trimpath -race ./internal/task/repository/sqlite -run 'Test(TaskEnvironmentAliasIdentity|PostgresAliasIdentity|WorkspaceInventoryRepair|TaskEnvironment)' -count=1)
(cd apps/backend && go run ./cmd/sqlguard ./internal)
(cd apps/backend && go test -trimpath -race ./internal/persistence/storeconformance -count=1)
bash scripts/lint-go-changed apps/backend/internal/worktree/store.go apps/backend/internal/worktree/store_alias_identity_test.go apps/backend/internal/worktree/store_alias_identity_postgres_test.go apps/backend/internal/task/repository/sqlite/task_environment.go apps/backend/internal/task/repository/sqlite/task_environment_alias_identity_test.go apps/backend/internal/task/repository/sqlite/task_environment_alias_identity_postgres_test.go
git diff --check
```

Configure `KANDEV_TEST_POSTGRES_DSN` for a disposable database before running
the complete block. Both packages must execute their PostgreSQL cases. A skipped
test is not concurrency evidence. Update the lint invocation for final helper
paths and include every changed Go file.

## Files likely touched

- `apps/backend/internal/worktree/{store,manager}.go` and focused store helpers.
- New `store_alias_identity_test.go` and PostgreSQL tests in that package.
- `apps/backend/internal/task/repository/sqlite/task_environment.go` and a private
  physical-identity transaction helper shared with the store where needed.
- New `task_environment_alias_identity_test.go` and
  `task_environment_alias_identity_postgres_test.go` in that repository package.
- `apps/backend/internal/worktree/recovery_admission.go` only if typed propagation needs it.

## Dependencies

Tasks 01 and 02 provide the explicit recovery path before stronger refusals ship.

## Risks

Session joins can resemble duplicate owners. Tombstoned inventory can coexist
with a valid active slot. PostgreSQL serialization must precede the first claim
read and use the established transaction-scoped advisory-lock pattern.

## Parallelism

`sequential`

## Inputs

- Linked design section on runtime ambiguity prevention.
- Existing store, shared-reference, physical-refresh, and recovery-admission tests.

## Results

Pending.
