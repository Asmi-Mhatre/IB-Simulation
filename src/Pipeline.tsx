import React, { useState } from "react";
import { computeInsights, Deal, dealHealth, stageIndex } from "./types";
import { stageInUse, useStore } from "./store";
import { AvatarStack, Badge, EmptyState, fmtMoney, HealthDot, relDays, toast } from "./ui";

function StageManager({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore();
  const [label, setLabel] = useState("");
  const [short, setShort] = useState("");
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal stage-manager" onClick={(e) => e.stopPropagation()}>
        <h2>Customize pipeline stages</h2>
        <p className="subtle">
          Rename, reorder, add or remove the stages every deal moves through. A stage can't be
          removed while a deal or task still sits in it.
        </p>
        <div className="stage-mgr-list">
          {state.stages.map((s, i) => {
            const inUse = stageInUse(state, s.id);
            return (
              <div key={s.id} className="stage-mgr-row">
                <span className="stage-mgr-num">{i + 1}</span>
                <input
                  className="stage-mgr-label"
                  value={s.label}
                  onChange={(e) =>
                    dispatch({ type: "renameStage", stageId: s.id, label: e.target.value, short: s.short })
                  }
                />
                <input
                  className="stage-mgr-short"
                  value={s.short}
                  title="Short label (shown on the stepper)"
                  onChange={(e) =>
                    dispatch({ type: "renameStage", stageId: s.id, label: s.label, short: e.target.value })
                  }
                />
                <div className="stage-mgr-actions">
                  <button className="btn btn-mini" disabled={i === 0} title="Move up" onClick={() => dispatch({ type: "moveStage", stageId: s.id, dir: "up" })}>
                    ↑
                  </button>
                  <button className="btn btn-mini" disabled={i === state.stages.length - 1} title="Move down" onClick={() => dispatch({ type: "moveStage", stageId: s.id, dir: "down" })}>
                    ↓
                  </button>
                  <button
                    className="btn btn-mini btn-danger"
                    disabled={inUse || state.stages.length <= 1}
                    title={inUse ? "In use by a deal or task — can't remove" : "Remove stage"}
                    onClick={() => dispatch({ type: "removeStage", stageId: s.id })}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <form
          className="inline-form stage-mgr-add"
          onSubmit={(e) => {
            e.preventDefault();
            if (!label.trim()) return;
            dispatch({ type: "addStage", label: label.trim(), short: short.trim() });
            toast(`Stage "${label.trim()}" added`);
            setLabel("");
            setShort("");
          }}
        >
          <input placeholder="New stage name…" value={label} onChange={(e) => setLabel(e.target.value)} />
          <input placeholder="Short label (optional)" value={short} onChange={(e) => setShort(e.target.value)} />
          <button className="btn btn-primary" type="submit">
            + Add stage
          </button>
        </form>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onOpen }: { deal: Deal; onOpen: (id: string) => void }) {
  const { state } = useStore();
  const now = new Date();
  const team = state.members.filter((m) => deal.teamIds.includes(m.id));
  const insights = computeInsights(deal, now, state.stages);
  const high = insights.filter((i) => i.severity === "high").length;
  const openTasks = deal.tasks.filter((t) => t.status !== "done").length;
  const close = relDays(deal.targetClose);

  return (
    <button className="deal-card" onClick={() => onOpen(deal.id)}>
      <div className="deal-card-top">
        <span className="deal-codename">
          <HealthDot health={dealHealth(deal, now, state.stages)} size={7} />
          {deal.codename}
        </span>
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
          {openTasks > 0 && <span>{openTasks} open</span>}
          <span className={close.overdue ? "overdue" : ""} title="target close">
            {close.overdue ? close.label : `closes ${close.label}`}
          </span>
        </span>
      </div>
    </button>
  );
}

export function Pipeline({ onOpen, onNewDeal }: { onOpen: (id: string) => void; onNewDeal: () => void }) {
  const { state } = useStore();
  const [showStages, setShowStages] = useState(false);
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
        <div className="page-header-actions">
          <button className="btn" onClick={() => setShowStages(true)}>
            ⚙ Customize stages
          </button>
          <button className="btn btn-primary" onClick={onNewDeal}>
            + New Deal
          </button>
        </div>
      </div>
      {showStages && <StageManager onClose={() => setShowStages(false)} />}
      {state.deals.length === 0 ? (
        <EmptyState
          icon="◆"
          title="No deals yet"
          hint="This is your empty workspace. Create your first mandate to start tracking it through the eight stages — gates, approvals, versioned documents and all."
          action={
            <button className="btn btn-primary" onClick={onNewDeal}>
              + Create your first deal
            </button>
          }
        />
      ) : (
        <div className="board">
        {state.stages.map((stage, i) => {
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
                  .sort((a, b) => stageIndex(a.stageId, state.stages) - stageIndex(b.stageId, state.stages))
                  .map((d) => (
                    <DealCard key={d.id} deal={d} onOpen={onOpen} />
                  ))}
                {deals.length === 0 && <div className="board-empty">—</div>}
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
