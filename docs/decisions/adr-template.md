# ADR-XXX: <Decision Title> (Phase <N>)

---

**Template Applicability:**
This template and its enforcement apply to ADR-010 and later.
Earlier ADRs are considered valid under prior governance rules.

---

## Status

Accepted | Proposed | Deprecated | Superseded

## Date

<YYYY-MM-DD>

## Phase

Phase <N> — <Phase Name>

OR

N/A — Cross-cutting / Meta-architecture

## Context

Describe the system state *before* this phase.

Include:
- What existed
- What was missing
- What risk or gap necessitated this phase

Do NOT include implementation steps.

## Decisions

List the concrete architectural decisions made in this phase.

Each decision must be:
- Specific
- Observable in the codebase
- Non-trivial to reverse

Example format:

### 1. <Decision Name>

**Decision:** <What was chosen>

**Rationale:** <Why this choice was made>

## Constraints Enforced

List invariants or constraints this phase explicitly preserved or introduced.

These must be observable in code—not aspirational.

Examples:
- No imports from `ai/runtime/`
- Single mutator pattern enforced
- No LLM calls
- Deterministic behavior only

## Alternatives Considered

List at least one alternative and why it was rejected.

OR provide an explicit statement explaining why no viable alternatives existed.

Example acceptable text:
> "No viable alternatives existed due to constraints X and Y."

Alternatives should reflect *real choices*, not strawmen.

### Alternative A: <Name>

**Description:** <What this alternative would have looked like>

**Rejected because:** <Why it wasn't chosen>

## Consequences

### Positive
- What is now possible
- What risk was reduced

### Negative / Tradeoffs
- What became harder
- What was deferred

### Neutral
- Structural changes with no immediate effect

## Outcome

Describe the *observable end state* of the system after this phase.

This should be verifiable via:
- Code inspection
- Database schema
- Validation scripts
- Runtime behavior

## Validation

List concrete validation evidence:
- Scripts run and results
- Tests passed
- Workflows observed
- Tables/files created

Example:
- [ ] `scripts/validate_phase_N.py` passes
- [ ] New files exist at `path/to/expected/`
- [ ] API endpoint returns expected response

## Notes for Future Phases

Explicit warnings to future contributors or LLMs:
- What must NOT be changed casually
- What semantics are intentionally missing
- What requires a new ADR before modification
