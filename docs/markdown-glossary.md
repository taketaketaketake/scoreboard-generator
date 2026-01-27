# Markdown Glossary

This document defines the **purpose, contents, and update cadence** for every markdown file in the repository.

---

## docs/markdown-glossary.md (this file)

**Purpose**
Defines the authoritative contract for all markdown files in the repository.

This file determines:
- What documentation exists
- What each file is responsible for
- When updates are mandatory

**What Goes Inside**
- File- and folder-level documentation contracts
- Update triggers
- Enforcement rules
- Routing logic for documentation changes

**What Does NOT Go Inside**
- System architecture
- Design rationale
- Phase summaries
- ADR content

**Audience**
LLMs first. Humans second.

**Update Cadence**
Rare and deliberate.

**Update Triggers**
- New markdown files are added anywhere in the repo
- New documentation categories are introduced
- Enforcement gaps or ambiguity are discovered
- Repository structure changes in a way that affects documentation responsibility

---

## README.md

**Purpose**
High-level human and LLM entry point to the repository.

**What Goes Inside**
- What this repo is
- What problem it solves
- How to get started (very high level)
- Pointers to deeper docs (vision.md, architecture.md)

**What Does NOT Go Inside**
- Detailed architecture
- Design rationale
- Prompt text

**Audience**
Humans first, LLMs second.

**Update Cadence**
Infrequent. Updated when the repo's purpose materially changes.

**Update Triggers**
- A phase is marked complete in `implementation-plan.md`
- The repo's stated purpose changes
- New top-level directories are added
- Getting started instructions become invalid

---

## implementation-plan.md

**Purpose**
Step-by-step execution plan for building the system.

**What Goes Inside**
- Phased infrastructure setup
- Dependencies between phases
- Explicit "stop points" for review
- What success looks like per phase

**What Does NOT Go Inside**
- Design debates
- Architecture diagrams
- Prompts

**Audience**
Humans and LLMs executing work.

**Update Cadence**
Updated as phases are completed or re-planned.

**Update Triggers**
- A phase is completed (mark as done, update status)
- A phase's scope is revised
- A new phase is added
- Phase dependencies change

---

## docs/ (Authoritative Documentation)

### docs/vision.md

**Purpose**
Defines why the system exists and what it is ultimately trying to achieve.

**What Goes Inside**
- System intent
- Non-goals
- Core principles
- Design bias

**What Does NOT Go Inside**
- Implementation details
- File structure
- Prompts

**Audience**
Humans and LLMs equally.

**Update Cadence**
Very rare. Vision should be stable.

**Update Triggers**
- System intent is redefined by explicit decision
- Core principles are added or removed


### docs/architecture.md

**Purpose**
Explains how the system is structured at a conceptual level.

**What Goes Inside**
- Layered architecture
- Data flow
- Responsibility boundaries
- High-level diagrams (textual)

**What Does NOT Go Inside**
- Code
- Prompts
- Implementation minutiae

**Audience**
Humans and LLMs.

**Update Cadence**
Occasional, when architecture changes.

**Update Triggers**
- New infrastructure layer is added
- Responsibility boundaries change
- Data flow paths are modified
- New services or components are introduced

### docs/invariants.md

**Purpose**
Defines truths that must remain true for the system to be correct.

**What Goes Inside**
- Hard constraints
- Non-negotiable rules
- Safety guarantees

**What Does NOT Go Inside**
- Aspirational goals
- Temporary decisions

**Audience**
LLMs first, humans second.

**Update Cadence**
Extremely rare. Changes imply deep refactors.

**Update Triggers**
- A system invariant is violated by design
- New non-negotiable constraints are identified
- Safety guarantees are added or modified

### docs/health-log.md

**Purpose**
Append-only log of codebase health assessments over time.

**What Goes Inside**
- Timestamped health assessment entries
- Dimensional ratings (architecture, code quality, etc.)
- Risks and recommended actions
- Executive summaries

**What Does NOT Go Inside**
- Detailed code analysis
- Implementation plans
- Bug reports

**Audience**
Humans and LLMs reviewing project health.

**Update Cadence**
Append-only. New entries added when health assessments are run.

**Update Triggers**
- User invokes `/health` or `codebase health check`
- Never delete or modify existing entries

### docs/decisions/

**Purpose**
Architecture Decision Records (ADRs) documenting significant decisions.

**What Goes Inside**
- One file per decision: `adr-NNN-short-slug.md`
- Follows `docs/decisions/adr-template.md`
- Context, decision, consequences, validation

**What Does NOT Go Inside**
- Implementation code
- Phase plans
- Temporary notes

**Audience**
Humans and LLMs understanding why decisions were made.

**Update Cadence**
Created per phase completion; rarely modified after acceptance.

**Update Triggers**
- A phase is completed (ADR required)
- A significant architectural decision is made
- Status change (Accepted → Deprecated)

### docs/audits/

**Purpose**
Phase audit records created when phases pass audit.

**What Goes Inside**
- One file per completed phase: `phase-NN-audit.md`
- Audit metadata, validation results, verdict

**What Does NOT Go Inside**
- Implementation details
- Code

**Audience**
LLMs verifying phase completion; humans reviewing history.

**Update Cadence**
Created once per phase completion. Never modified.

**Update Triggers**
- Phase audit returns PASS verdict

---

## CLAUDE.md

**Purpose**
Persistent context for Claude when working in this repository.

**What Goes Inside**
- What the repository is
- How to reason about the system
- Rules Claude must follow
- Phase completion protocol
- Pointers to documentation

**What Does NOT Go Inside**
- Detailed architecture (use docs/architecture.md)
- Implementation plans
- Code

**Audience**
LLMs only.

**Update Cadence**
Rare. Updated when Claude's behavioral rules change.

**Update Triggers**
- New mandatory protocols are introduced
- Existing rules are modified
- Documentation structure changes

---

## skills/ (LLM Skills)

### skills/llm/phase-audit.md

**Purpose**
Defines the phase_audit skill for verifying phase completion.

**What Goes Inside**
- Skill inputs and preconditions
- Step-by-step procedure
- PASS/FAIL criteria
- Output format
- Invocation examples

**What Does NOT Go Inside**
- Business logic
- Architecture decisions

**Audience**
LLMs executing the skill.

**Update Cadence**
Rare. Updated when audit requirements change.

**Update Triggers**
- New audit checks are added
- Audit procedure is modified
- PASS/FAIL criteria change

### skills/codebase-health.md

**Purpose**
Defines the codebase_health skill for assessing project health.

**What Goes Inside**
- Skill invocation triggers
- Assessment procedure
- Dimension ratings
- Output format

**What Does NOT Go Inside**
- Actual health assessments (those go in health-log.md)

**Audience**
LLMs executing the skill.

**Update Cadence**
Rare. Updated when assessment criteria change.

**Update Triggers**
- New dimensions are added to assessment
- Procedure is modified