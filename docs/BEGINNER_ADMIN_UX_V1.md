# Beginner-First Admin UX — Phase 1

## Goal

Make the Irha Apparels admin usable by a new, non-technical operator without removing any working business module.

## Navigation model

The admin is grouped into five plain-language business areas:

1. Home
2. Customers
3. Products
4. Marketing
5. Business Operations

Advanced technical controls remain separated under **System & Settings**.

## Phase 1 changes

- Replaced technical navigation labels with plain business language.
- Added one-line guidance explaining what every admin page is for.
- Added a searchable page/tool launcher with `Cmd/Ctrl + K` support.
- Added a five-item mobile bottom navigation for iPhone use.
- Increased tap-target sizes and reduced mobile navigation friction.
- Preserved all existing panels, data connections, auth checks, and Supabase-backed workflows.
- Kept advanced system tools available without placing them in the primary daily workflow.

## Safety rules

- No service-role key is exposed.
- No RLS policy is changed.
- No live data is deleted or replaced.
- No existing admin panel is removed.
- The change only reorganizes and explains the existing working system.

## Next build batches

1. Guided Add Lead workflow.
2. Guided Add/Edit Product workflow.
3. Guided Quotation and PI workflow.
4. Guided Meeting and Follow-up workflow.
5. Real owner checklist and measurable business-health strip.
6. Cross-entity search for buyers, products, quotations, meetings, and tasks.
7. Plain-language empty, error, retry, and success states across every panel.
