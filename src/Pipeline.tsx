import React from "react";
import { computeInsights, Deal, STAGES, stageIndex } from "./types";
import { useStore } from "./store";
import { AvatarStack, Badge, fmtMoney, relDays } from "./ui";

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: (id: string) => void }) {
  const { state } = useStore();
  const team = state.members.filter((m) => deal.teamIds.includes(m.id));
  const insights = computeInsights(deal, new Date());
  const high = insights.filter((i) => i.severity === "high").length;
  const openTasks = deal.tasks.filter((t) => t.status !== "done").length;
  const unresolved = deal.comments.filter((c) => !c.resolved).length;
  const close = relDays(deal.targetClose);

  return (
    <button className="deal-card" onClick={() => onOpen(deal.id)}>
      <div className="deal-card-top">
        <span className="deal-codename">{deal.codename}</span>
        <span className="deal-value">{fmtMoney(deal.valueM)}</span>
      </div>
      <div className="deal-card-name">{deal.name}</div>
      <div className="deal-card-client">{deal.client}</div>
      <div className="deal-card-meta">
        <Badge kind="type">{deal.type}</Badge>
        {high > 0 && <Badge kind="alert">{high} flag{high > 1 ? "s" : ""}</Badge>}
      </div>
      <div className="deal-card-bottom">
        <AvatarStack members={team} max={3} />
        <span className="deal-card-stats">
          {openTasks > 0 && <span title="open tasks">☐ {openTasks}</span>}
          {unresolved > 0 && <span title="unresolved comments">💬 {unresolved}</span>}
          <span className={close.overdue ? "overdue" : ""} title="target close">
            ⏱ {close.label}
          </span>
        </span>
      </div>
    </button>
  );
}

export function Pipeline({ onOpen, onNewDeal }: { onOpen: (id: string) => void; onNewDeal: () => void }) {
  const { state } = useStore();
  const totalValue = state.deals.reduce((s, d) => s + d.valueM, 0);

  return (
    <div className="pipeline">
      <div className="page-header">
        <div>
          <h1>Deal Pipeline</h1>
          <p className="subtle">
            {state.deals.length} live mandates · {fmtMoney(totalValue)} aggregate deal value
          </p>
        </div>
        <button className="btn btn-primary" onClick={onNewDeal}>
          + New Deal
        </button>
      </div>
      <div className="board">
        {STAGES.map((stage, i) => {
          const deals = state.deals.filter((d) => d.stageId === stage.id);
          return (
            <div className="board-col" key={stage.id}>
              <div className="board-col-header">
                <span className="stage-num">{i + 1}</span>
                <span className="stage-label">{stage.label}</span>
                <span className="stage-count">{deals.length}</span>
              </div>
              <div className="board-col-body">
                {deals
                  .sort((a, b) => stageIndex(a.stageId) - stageIndex(b.stageId))
                  .map((d) => (
                    <DealCard key={d.id} deal={d} onOpen={onOpen} />
                  ))}
                {deals.length === 0 && <div className="board-empty">—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
