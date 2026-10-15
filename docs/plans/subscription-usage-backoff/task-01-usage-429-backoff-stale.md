---
id: "01-usage-429-backoff-stale"
title: "Back off usage reads on 429 and serve a bounded stale reading"
status: done
wave: 1
depends_on: []
plan: "plan.md"
requirements:
  - REQ-COSTS-SUBSCRIPTION-USAGE-001
acceptance_criteria:
  - AC-COSTS-SUBSCRIPTION-USAGE-001.9
  - AC-COSTS-SUBSCRIPTION-USAGE-001.10
  - AC-COSTS-SUBSCRIPTION-USAGE-001.11
  - AC-COSTS-SUBSCRIPTION-USAGE-001.12
system_design:
  - ../../specs/costs/system-design/subscription-usage.md
---

# Task 01: Back off usage reads on 429 and serve a bounded stale reading

## Summary

Port the residual upstream change that lets a refused provider usage read carry
its status and `Retry-After` hint into the cache, back off exponentially on 429,
and serve the last known success as explicitly stale for a bounded window
instead of returning a nil, error pair.

## In scope

- `client_claude.go` and `client_codex.go` return a typed status failure for a
  non-OK response, preserving the status and `Retry-After` header.
- The new `retry_after.go` status error exposes `StatusCode()`/`RetryAfter()`,
  parses the header (delta-seconds or HTTP-date, clamped to 15 minutes), and
  classifies a 429.
- `cache.go` records backoff and failure count, selects a provider hint, an
  exponential 429 window, or the base window, and serves a preserved success as
  `Stale` for at most 30 minutes.
- `types.go` adds `ProviderUsage.Stale`.

## Out of scope

The fork-only `usage/errors.go`, Office overview rendering, locale copies, web
API/DTO plumbing, a clock seam, and every standing test file.

## Acceptance

1. A non-OK provider response surfaces its status and `Retry-After` to the cache.
2. A 429 backs off on the provider hint, else exponentially from 15 seconds to a
   15-minute cap.
3. A preserved success younger than 30 minutes is served as `Stale`; older, the
   provider error is reported.
4. `GetOrFetchWithin` never returns a nil reading as success when a lookup
   reports the cached error, and never panics on an expired nil success.

## Verification

- `go build`, `go vet`, `gofmt -l` clean on the package.
- Existing package tests pass; a temporary in-package probe covers a first
  failure, a valid success followed by a 429, a success older than 30 minutes,
  and an expired nil success, then is deleted.
- `validateCoverage` returns `covered` for the changed paths and this package.

## Files likely touched

- `apps/backend/internal/agent/usage/cache.go`
- `apps/backend/internal/agent/usage/client_claude.go`
- `apps/backend/internal/agent/usage/client_codex.go`
- `apps/backend/internal/agent/usage/retry_after.go` (new)
- `apps/backend/internal/agent/usage/types.go`
- `docs/specs/costs/requirements/subscription-usage.md`
- `docs/specs/costs/system-design/subscription-usage.md` (new)
- `docs/plans/subscription-usage-backoff/plan.md`
- `docs/plans/subscription-usage-backoff/task-01-usage-429-backoff-stale.md`

## Dependencies

None. Upstream already coalesces fetches and preserves a valid success, so those
parts are not re-ported.

## Inputs

- [Owning requirement](../../specs/costs/requirements/subscription-usage.md)
- [Owning design](../../specs/costs/system-design/subscription-usage.md)
- [Plan](plan.md)

## Risks

A stale reading past its bound hides a real provider error; a nil success read as
stale panics or masks an error; a cached error returned as a nil success clears
the rate-limit signal.

## Parallelism

`sequential`

## Results

Implemented on branch `feature/p49-usage-429-backof-hrh`. Provider clients and
the cache changed as scoped; `go build`, `go vet`, and `gofmt -l` are clean and
the existing package tests pass. A temporary in-package probe confirmed the four
contract cases (first failure returns the error, a valid success followed by a
429 is served `Stale`, a 31-minute-old success reports the error, and an expired
nil success no longer panics) and was removed after the run.
