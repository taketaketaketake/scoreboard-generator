# System Invariants

This document defines **non-negotiable invariants** of the system.

These invariants are architectural constraints that must hold regardless
of implementation details, agent behavior, model choice, or future
feature additions.

If a change violates one of these invariants, the change is incorrect
and must be revised or rejected.

---

1. Phase Completion Requires Passing Audit

**No phase may transition to COMPLETE without a passing phase audit.**

The mandatory sequence is:

| Step | Required |
|------|----------|
| Implementation | ✅ |
| Validation scripts pass | ✅ |
| Phase audit invoked | ✅ |
| ADR created and valid | ✅ |
| Glossary triggers satisfied | ✅ |
| Stubs registry updated | ✅ |
| Audit verdict: PASS | ✅ |
| Only then mark COMPLETE | ✅ |

This invariant is enforced by:
- `skills/llm/phase-audit.md` (procedure)
- `CLAUDE.md` Phase Completion Protocol (behavioral rule)

Violations of this invariant cause:
- Documentation drift (files not updated)
- Missing ADRs (decisions not recorded)
- Stale stubs registry (replaced stubs not marked)
- Audit debt that compounds over phases

**The audit must be RUN, not just PASSED.**

Claude must refuse to:
- Mark a phase complete without running the audit
- Proceed after a FAIL verdict without remediation
- Skip the audit even if "confident" the phase is correct

This ensures near-zero documentation drift and maintains the system's self-describing property.

---

2. Image Generation Constraints

**I2.1** Generated images MUST be exactly 1080x1080 pixels.

**I2.2** Scores MUST be non-negative integers between 0 and 999.

**I2.3** Team colors MUST be valid hex color codes.

---

3. Job Scheduling Constraints

**I3.1** Postgame jobs MUST NOT start before the scheduled game start time.

**I3.2** A game MUST NOT have more than one active postgame job at a time.

**I3.3** Jobs scheduled via setTimeout MUST be tracked for cleanup on shutdown.

---

4. Data Integrity

**I4.1** ESPN event IDs MUST be treated as opaque strings, never parsed or modified.

**I4.2** Odds data MUST include a `capturedAt` timestamp.

**I4.3** Game records MUST be written only after successful image generation.

---

5. External Services

**I5.1** R2 uploads MUST be verified accessible before sending via Twilio.

**I5.2** Twilio messages MUST include both image URL and score text.

**I5.3** ESPN API failures MUST NOT crash the process; retry or skip gracefully.

---

6. Process Lifecycle

**I6.1** The orchestrator MUST handle SIGINT gracefully, canceling scheduled jobs.

**I6.2** Cron jobs MUST use America/Detroit timezone.

**I6.3** The server MUST start the orchestrator cron jobs on boot.

---

7. Documentation Authority

**I7.1** `implementation-plan.md` is the sole authority for what work is authorized.

**I7.2** `markdown-glossary.md` is the sole authority for documentation update triggers.

---

8. Error Isolation

**I8.1** Errors in one game's processing MUST NOT affect other games.

**I8.2** Failed uploads or sends MUST be logged with sufficient detail for diagnosis.

**I8.3** Polling MUST have a maximum attempt limit to prevent infinite loops.