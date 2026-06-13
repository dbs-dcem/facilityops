# FacilityOps — Project Context

> This file is read automatically by Claude Code at the start of every session.
> It is the source of truth for what this project is and how to build it.
> Keep it updated as decisions change.

## What this is

A mobile-first, guided **MOP runner + preventive-maintenance manager** for data-center
technicians. The wedge product turns a facility's Methods of Procedure (MOPs) and PM
checklists into step-by-step, checkpoint-verified workflows that produce an immutable,
time-stamped audit trail. A later phase adds an on-prem-capable AI "facility expert"
that answers tech questions grounded in the facility's own captured procedures and logs.

The thesis: ~85% of human-error data-center outages come from staff not following
procedures, and senior operators are retiring with undocumented knowledge. A guided
execution tool attacks both — it reduces skipped steps now and captures the procedural
corpus that feeds the AI expert later.

## Target user & pilot

- **Pilot customer:** mid-market / single-site data-center operators (not hyperscale,
  not multi-tenant colo yet). One facility, one set of stakeholders, real procedural-error pain.
- **Primary user:** facility technician running PM tasks on a phone/tablet on the floor.
- **Secondary user:** senior operator who authors/digitizes the MOPs (web side).
- Colo (multi-tenant) is a known later expansion: same product + a tenancy/isolation layer.

## Product scope — phases

**Phase 1 (build now): MOP runner + maintenance menu**
- Maintenance home: PM task catalog with due/overdue tracking; toggle organize-by-system
  vs organize-by-interval; tap a task to run it.
- Guided execution: one step at a time; four checkpoint types:
  - `ack` — acknowledge/confirm
  - `reading` — numeric entry with expected-range validation; out-of-range is logged & flagged, not blocked
  - `photo` — capture attached to the record
  - `scan` — asset-tag scan to confirm correct unit
- **Hard checkpoints cannot be skipped** (safety-critical gating).
- Completion writes an immutable, time-stamped audit trail and resets the task interval.
- **Offline-first execution** (data halls have dead spots); sync when reconnected.

**Phase 1.5 (enhancement): live protocol ingestion**
- Auto-populate `reading` checkpoints from BACnet / Modbus TCP / SNMP instead of manual entry.
- This is the domain moat (controls/BACnet expertise). Do NOT build before Phase 1 workflow is proven.

**Phase 2 (upsell): AI facility expert**
- Retrieval over the captured corpus (procedures, equipment, logged readings, incident notes).
- Answers tech questions grounded in *that facility's* data.
- **Hybrid AI provider abstraction from day one:** one interface, three configs —
  cloud API / local vLLM (on-prem) / hybrid. On-prem is the differentiator (operators
  won't send telemetry to the cloud). Build the abstraction early even though Phase 1 has no AI.

## Hard constraints / non-negotiables

- **No control-system writes in Phase 1.** Read-only or manual entry only. This is the
  trust firewall that keeps the sales cycle short — the app must never be able to take down a facility.
- Hard checkpoints must be truly un-skippable in the UI and enforced server-side.
- Audit trail must be immutable and time-stamped (append-only).
- Offline-first is a requirement, not a nice-to-have.

## Tech stack (decided)

- **Mobile:** React Native + Expo + TypeScript (same stack as the dev's iris-rss-monitor app).
- **Backend:** Node or Python, with a local-first sync layer.
- **DB:** Postgres for the structured corpus (procedures, runs, readings, assets).
- **Phase 2 AI:** vector store + provider abstraction over {cloud API, local vLLM/Qwen, hybrid}.
- **On-prem packaging:** Docker Compose that runs backend + inference in-building
  (itself a sales asset).

## The design-reference prototype

`docs/mop-runner-prototype.jsx` is a **self-contained React (web) prototype** that
demonstrates the intended UX: maintenance menu, system/interval toggle, due-tracking,
the four checkpoint types, hard-checkpoint gating, and the completion audit trail.

It is a **UX/spec reference, not the app skeleton.** Do not port it verbatim to React
Native — re-implement its behavior idiomatically in Expo. Use it to understand intended
flow, states, the PM catalog shape, and the instrument-panel visual direction.

The PM catalog inside the prototype (UPS daily checks, generator weekly, CRAC monthly
filter, PDU phase balance, fire-suppression monthly, CRAC quarterly coil clean, UPS
annual load-bank, environmental daily walk) reflects standard DC PM intervals and is a
reasonable starter seed. A real design partner's own tasks/assets/intervals replace it.

## Data model sketch (starting point — refine in code)

- `asset` (id, name, system[power|cooling|fire|env], location)
- `procedure` (id, title, asset_id, interval, risk_statement, version)
- `step` (id, procedure_id, order, kind[ack|reading|photo|scan], detail, hard:bool,
  expected_range?, expected_tag?, ack_label?)
- `run` (id, procedure_id, tech_id, started_at, completed_at, status)
- `run_entry` (id, run_id, step_id, value, flagged:bool, photo_ref?, ts)  <- append-only
- Due/overdue is computed from interval + last completed run.

## First Claude Code tasks (suggested order)

1. Scaffold the Expo + TypeScript app; set up navigation (Home -> Runner -> Done).
2. Define the TypeScript types from the data model sketch above.
3. Build the maintenance Home: catalog list, system/interval toggle, due-status logic.
4. Build the Runner with the four checkpoint components + hard-checkpoint gating.
5. Build the Done/audit-trail screen; wire completion -> interval reset.
6. Add local persistence (offline-first) before any backend.
7. Only then: backend + sync, then Phase 1.5 protocol ingestion, then Phase 2 AI.

## Open questions to resolve with a design partner

- Exact MOP authoring friction — digitizing the first procedures must be near-effortless
  or the pilot stalls. This is the #1 adoption risk, not the technology.
- Real interval/asset taxonomy for the specific facility.
- Whether the pilot needs the protocol bridge to be compelling, or manual entry suffices to prove value.
