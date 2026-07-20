# DealOS — Deal Execution Workspace (MVP)

A collaborative operating system for running corporate transactions — M&A, capital raises,
restructurings. Built for anyone who executes deals: boutique advisors, Big 4 TAS,
private equity, corporate development, family offices, and infrastructure funds.

## Running it

```bash
npm install
npm run dev        # http://localhost:5173
```

Data persists in the browser (localStorage) and ships with five realistic seeded deals.
Use **Reset demo data** in the sidebar (click twice) to restore the seed.

## What's in the MVP

This deliberately implements **Phase 2 (workflow first)** of the product plan, with the
Phase 3 "AI as infrastructure" idea prototyped as a deterministic rules engine:

- **Pipeline board** — every live mandate across the 8 stages of a transaction:
  Client Mandate → NDA & Engagement → Data Room & Diligence → Modeling & Valuation →
  Internal Review → Client Materials → Negotiation & Signing → Closing.
- **Stage gates** — tasks can be marked *blocking*; a deal cannot advance until its
  gate tasks are done. This encodes the approval bottlenecks real deal teams live with.
- **Checklist with sign-offs** — tasks carry assignees, due dates, and an optional
  senior-approval step that is tracked separately from completion.
- **Documents with version history** — every document has typed versions with change
  notes, an owner, and a review status (draft → in review → approved).
- **Dependency-aware staleness detection** — a pitch book can be declared dependent on
  a model; if the model gets a newer version, the pitch book is flagged **stale**.
  This is the "version chaos" problem, made visible.
- **Comments with resolution tracking** — unresolved comments age and get surfaced.
- **Activity feed** — an audit trail of everything that happened on the deal.
- **Deal Review panel** — automated checks per deal: overdue tasks, open stage gates,
  missing sign-offs, stale documents, aging unresolved comments, documents stuck in
  review. Today it's a rules engine; the architecture point is that AI review should be
  ambient infrastructure, not a chat window. (See `computeInsights` in `src/types.ts` —
  swapping in an LLM-backed reviewer means replacing one pure function.)

## What's deliberately NOT here yet

Per the plan — validate the workflow with 15–20 practitioner interviews before building:

- Real auth, multi-user sync, and a backend (state is local; the reducer in
  `src/store.tsx` is already shaped like an event log, so moving to a server API or
  CRDT sync later is straightforward).
- File storage / real data rooms, email integration, external sharing.
- LLM-powered features (drafting, extraction, inconsistency detection across file
  contents).

## Code map

| File | What it is |
|---|---|
| `src/types.ts` | Domain model (stages, deals, tasks, docs, comments) + insight rules engine |
| `src/seed.ts` | Five realistic demo deals with relative dates so the demo always looks live |
| `src/store.tsx` | State reducer + localStorage persistence; every mutation logs to the activity feed |
| `src/Pipeline.tsx` | Kanban pipeline board |
| `src/Workspace.tsx` | Per-deal workspace: overview, checklist, documents, comments, activity |
| `src/NewDealModal.tsx` | Deal creation |
| `src/App.tsx` | Shell, sidebar, navigation |
