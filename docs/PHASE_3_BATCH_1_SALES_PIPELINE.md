# Phase 3 / Batch 3.1 — Sales Pipeline & CRM Tasks

## Delivered frontend

Admin now includes a dedicated **Sales Pipeline** workspace that unifies:

- RFQ/inquiry buyers;
- catalogue request buyers;
- imported/researched B2B prospects.

The workspace provides:

- canonical stages from New to Won/Lost;
- horizontal Kanban board with a mobile-safe stage selector;
- action queue ranked by priority, follow-up due date and recency;
- source, priority, due-date and full-text filters;
- buyer side drawer with contact links, requirement details, quotation link and follow-up scheduling;
- evidence-based next action without claiming order probability;
- CRM task creation, due dates, assignee, priority and completion state;
- dashboard shortcut for direct daily access.

## Backend prepared, not applied

Migration: `20260713040000_sales_pipeline_tasks.sql`

It prepares:

- `crm_tasks` with polymorphic links to inquiry, catalogue or prospect source records;
- `crm_activity_events` append-only timeline;
- admin-only RLS;
- task actor/update triggers;
- automatic task-created and task-completed activity events;
- canonical CRM columns and indexes on all three existing source tables.

Per owner instruction, the migration remains deferred for the one-time final backend activation. No Supabase project was queried or changed during this batch.

## Safety and truthfulness

- Stages update the original source record instead of copying or deleting buyer data.
- Imported prospects keep their legacy lead status synchronized for backward compatibility.
- Missing task tables produce a truthful deferred-activation message.
- No email, WhatsApp message, quotation or public action is sent automatically.
- Next action is deterministic workflow guidance, not sales probability or invented buyer intent.
- Owner approval remains required for outbound contact and commercial commitments.

## Phase 3 roadmap

- **3.1** Sales Pipeline & CRM Tasks
- **3.2** Buyer 360 profile, contacts, timeline, duplicates and files
- **3.3** Meetings, samples, quotations and commercial follow-up integration
- **3.4** Daily owner dashboard, reports, saved views and team usability
