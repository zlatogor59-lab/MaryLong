# Professional priorities and conclusion

Status: implemented, scenario-tested and visually verified; stage completed on 2026-09-27.

This document describes the professional-only workflow that follows the completed nutrient calculation modules. It does not define or publish client-facing text.

## Workflow

1. Collect eligible signals from the completed calculation modules.
2. Rank them for the current client.
3. Merge related signals so that one clinical theme occupies only one place in the top three.
4. Allow the consultant to review and change the proposed top three.
5. Build a structured professional conclusion and a consultant-editable draft.
6. Show a professional-only A4 preview for review and printing.

## Automatic ranking

The ranker considers signal strength/base priority, the client's goal, repetition, data quality and clinical context. The current explicit context bonuses are:

- goal match: `+25`;
- repeated module/pattern: `+20`;
- relevant clinical context: `+30`.

The score is used for ordering inside the report, not as a diagnosis or disease probability. Factor explanations remain available to the consultant.

Related signals are clustered before the top three are selected. Current clusters:

- `fat` + `processed_meat`;
- `oxalate_calcium` + `calcium_phosphorus`.

The cluster keeps the underlying findings but consumes only one top-three position.

## Consultant review

The consultant can reorder, remove or promote a detected signal, up to three final priorities. Every manual change requires a reason. Reviews are versioned, audited and tied to the source calculation by a hash. A changed source invalidates the previous review. The reason is stored encrypted.

Database migration: `202609260001_professional_priority_reviews`.

## Professional conclusion

The structured conclusion contains six sections:

- `assessment_basis`;
- `priority_findings`;
- `supporting_findings`;
- `data_limitations`;
- `consultant_decision`;
- `readiness`.

The editable professional draft includes priority interpretation, supporting interpretation, follow-up questions and a final note. Statuses are `draft`, `needs_clarification` and `ready`. A deviation from the automatic result requires both an explicit checkbox and a reason. Readiness blockers prevent an incomplete draft from being marked ready.

Drafts are versioned, audited, source-bound and encrypted where consultant text is stored.

Database migration: `202609260002_professional_conclusion_drafts`.

## Preview and publication boundary

The A4 preview is professional-only. It includes the generated professional draft and the consultant's entered formulations/status. It excludes input controls, client previews and unrelated technical modules. Opening the preview does not save or publish anything.

Client publication status for this workflow is `not_applicable`. No client-facing conclusion is generated or published without explicit confirmation.

## Verification

Scenario coverage includes:

- standard ranking;
- incomplete data;
- manual reordering;
- merged calcium/oxalate theme;
- stale review after source changes;
- readiness blocked by missing content;
- required interpretation;
- required deviation reason.

The last complete automated run passed `522/522` tests, including database tests. After print-preview CSS adjustments, the targeted `13/13` tests and the build passed.

Visual QA found and corrected:

- a hidden deviation-reason field appearing when the checkbox was off;
- unrelated protein/booking/note panels appearing below the conclusion in print preview;
- horizontal cropping in a narrow preview panel.

## Exact continuation point

The final narrow-panel A4 preview check passed on 2026-09-27 using the synthetic consultant scenario. The document had no horizontal overflow, contained each of the six professional sections once, and excluded protein-intake, booking, consultant-note, client-facing and editor-control content. Russian labels and wrapping were readable. This stage is closed; the next session can move to the next agreed product stage.
