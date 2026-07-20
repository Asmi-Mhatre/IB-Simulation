<div align="center">

# ◆ DealOS

### The open-source operating system for deal execution

**GitHub became where software gets built. Figma became where design happens.<br>DealOS is where deals get done.**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

</div>

---

## 🔥 The problem, in one picture

```mermaid
flowchart LR
    subgraph TODAY["😩 How deals run today"]
        direction TB
        X1["📊 Excel<br><i>Final_v7_FINAL_MD-fix.xlsx</i>"]
        X2["📽️ PowerPoint<br><i>stale numbers on slide 8</i>"]
        X3["📧 Email<br><i>approvals lost in inboxes</i>"]
        X1 -.->|"which version<br>is real?"| X2
        X2 -.->|"did the MD<br>sign off?"| X3
        X3 -.->|"who has the<br>latest file?"| X1
    end

    subgraph DEALOS["◆ DealOS"]
        direction TB
        Y1["One workspace"]
        Y2["Versioned docs that<br>flag themselves stale"]
        Y3["Gates + sign-offs<br>enforced by software"]
        Y1 --- Y2 --- Y3
    end

    TODAY ==> DEALOS
```

AI startups automate single tasks — models, pitch books, diligence.
**Nobody owns the workflow those tasks live inside.** And everyone executes deals: banks, boutiques, Big 4, PE, corp dev, family offices.

---

## 🗺️ How a deal flows

Eight stages. Every deal is a card moving left → right on a kanban board.

```mermaid
flowchart LR
    A["1️⃣ Client<br>Mandate"] --> B["2️⃣ NDA &<br>Engagement"] --> C["3️⃣ Data Room<br>& Diligence"] --> D["4️⃣ Modeling &<br>Valuation"]
    D --> E["5️⃣ Internal<br>Review"] --> F["6️⃣ Client<br>Materials"] --> G["7️⃣ Negotiation<br>& Signing"] --> H["8️⃣ Closing"]
    style E fill:#2745d4,color:#fff
```

---

## 🔒 Stage gates — deals advance only when the work says so

```mermaid
flowchart LR
    T1["✅ Normalize financials<br><b>gate task</b>"] --> GATE{"All gate tasks<br>done?"}
    T2["⬜ MD review of deck<br><b>gate task</b> · overdue"] --> GATE
    T3["⬜ Investor list<br>regular task"] -.->|"doesn't block"| GATE
    GATE -->|"❌ no"| STAY["🔒 Deal stays in<br>Internal Review<br><i>banner shows exactly<br>what's blocking</i>"]
    GATE -->|"✅ yes"| GO["🚀 Advance to<br>Client Materials"]
    style STAY fill:#fff4e6,color:#8a5a10
    style GO fill:#e6f4ef,color:#158060
```

**Bonus rule — done ≠ approved.** Tasks can require senior sign-off, tracked *separately* from completion:

```mermaid
flowchart LR
    A["⬜ To do"] --> B["🔄 In progress"] --> C["✅ Done<br><i>analyst finished it</i>"] --> D["🖋️ Approved<br><i>MD blessed it</i>"]
    style C fill:#fff4e6,color:#8a5a10
    style D fill:#e6f4ef,color:#158060
```

---

## 📄 Documents that know when they're stale

Documents declare **dependencies**. When an upstream doc gets a new version, everything downstream is flagged automatically — *before* the client sees inconsistent numbers.

```mermaid
flowchart TD
    DATA["🗂️ Data room extract<br>v2 · <i>restated FY25</i>"] --> MODEL["📊 Operating Model<br>v3 · updated yesterday"]
    MODEL --> DECK["📽️ Pitch Book<br>v1 · ⚠️ <b>STALE</b><br><i>model changed after<br>this was drafted</i>"]
    style DECK fill:#fdecec,color:#c02626
    style MODEL fill:#e6f4ef,color:#158060
    style DATA fill:#e6f4ef,color:#158060
```

Each doc also moves through a review lifecycle with full version history + change notes:

`draft` → `in review` → `approved`

---

## ✨ Deal Review — AI as infrastructure, not chatbot

A panel on every deal that continuously runs six checks:

| | Check | Catches |
|---|---|---|
| 🔴 | **Stale documents** | A dependency updated after this doc's last version |
| 🔴 | **Overdue tasks** | Deadlines slipping — weighted higher if they block the stage |
| 🟠 | **Open stage gates** | Exactly what stands between the deal and the next stage |
| 🟠 | **Missing sign-offs** | Work marked done that no senior approved |
| ⚪ | **Aging comments** | Unresolved feedback older than 3 days |
| ⚪ | **Stuck reviews** | Documents sitting in "in review" limbo |

```mermaid
flowchart LR
    subgraph DEAL["Deal state"]
        TASKS["tasks"]
        DOCS["docs + versions"]
        COMMENTS["comments"]
    end
    DEAL --> ENGINE["⚙️ computeInsights()<br><i>one pure function</i>"]
    ENGINE --> PANEL["✨ Deal Review panel<br><i>flags, ranked by severity</i>"]
    ENGINE -.->|"Phase 3: swap for<br>LLM-backed reviewer<br><b>nothing else changes</b>"| LLM["🤖"]
    style ENGINE fill:#eef1fd,color:#2745d4
```

The bet: AI should **quietly review the deal in the background** — not sit in a chat window. Today it's a deterministic rules engine; swapping in an LLM later replaces one function ([`computeInsights` in `src/types.ts`](src/types.ts)).

---

## 🚀 Quick start

```bash
npm install
npm run dev        # → http://localhost:5173
```

Ships with **5 realistic seeded deals** (sell-side renewables, buy-side consumer, hospital capital raise, logistics deal in final negotiation, fresh mandate). Dates are generated relative to today, so the demo always looks live. Data lives in localStorage — **Reset demo data** (sidebar, click twice) restores the seed.

---

## 🏗️ How it's built

```mermaid
flowchart LR
    UI["🖥️ React UI<br>Pipeline · Workspace<br>Checklist · Docs · Comments"] <--> STORE["🗃️ Reducer store<br><i>every action logs to<br>the activity feed</i>"]
    STORE <--> LS[("localStorage<br><i>no backend — on purpose</i>")]
    STORE --> ENGINE2["⚙️ Insight engine"]
    style STORE fill:#eef1fd,color:#2745d4
```

| File | Role |
|---|---|
| [`src/types.ts`](src/types.ts) | Domain model **+ Deal Review rules engine** |
| [`src/seed.ts`](src/seed.ts) | 5 demo deals, relative dates |
| [`src/store.tsx`](src/store.tsx) | Reducer + persistence; mutations auto-log to activity feed |
| [`src/Pipeline.tsx`](src/Pipeline.tsx) | Kanban board across the 8 stages |
| [`src/Workspace.tsx`](src/Workspace.tsx) | Per-deal workspace (5 tabs) |
| [`src/NewDealModal.tsx`](src/NewDealModal.tsx) | Deal creation |
| [`src/App.tsx`](src/App.tsx) | Shell + navigation |

> **Why no backend?** Deliberately zero-infrastructure: clone, `npm install`, and you have the full product running in 30 seconds — no database, no docker-compose, no signup. The reducer is already shaped like an event log, so multi-user sync (server API / CRDTs) slots in without a rewrite when the project gets there.

---

## 🧭 Roadmap

```mermaid
timeline
    title From workflow to operating system
    Phase 1 · Workflow ✅ : Gates, sign-offs, versions, dependencies, audit trail — shipped
    Phase 2 · Depth : Richer checklists & templates per deal type : More insight rules : Import & export
    Phase 3 · AI as infrastructure : LLM reviewer reads file contents : Cross-doc inconsistency detection : First-draft generation
    Phase 4 · The OS : Multi-user sync + permissions : Real data rooms : Integrations — where deals happen
```

**The thesis in one line:** capture the real workflow first — AI is only as valuable as the process it lives inside.

---

## 🤝 Contributing

Contributions are welcome — especially from people who've lived inside real deals.

- **Know deals, not code?** Open an issue describing a workflow pain point: review cycles, approval bottlenecks, version chaos, "we always do it this way" processes. Ground truth about how deal teams actually work is the most valuable contribution this project can get.
- **Know code?** Good first areas:
  - New insight rules in [`computeInsights`](src/types.ts) — it's one pure function, easy to extend and test
  - Deal-type-specific checklist templates (LBO vs. sell-side vs. capital raise)
  - Import/export (JSON, CSV)
  - Accessibility and keyboard navigation
- Keep PRs small and focused. `npm run build` must pass (it typechecks).

## 📄 License

[MIT](LICENSE) — use it, fork it, run your deals on it.

---

<div align="center">
<sub>Built by people who've lived through the version chaos. ◆</sub>
</div>
