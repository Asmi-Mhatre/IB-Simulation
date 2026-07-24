import React, { useMemo, useRef, useState } from "react";
import { Deal, latestVersionDate, stageIndex, Task } from "./types";
import { useStore } from "./store";
import { Avatar, Badge, fmtDate, relDays, toast } from "./ui";

/**
 * The Deal Copilot: it executes the routine work of the current stage, tees up
 * the work that needs a human, flags issues it finds — and then stops at the
 * gate. It never marks a gate task done, never signs off, never advances a
 * stage. Those are the human's calls, and the copilot hands the deal back for
 * them. Every action it takes is dispatched through the real store and logged
 * in Activity, so a run is fully auditable.
 */

type StepKind = "execute" | "prepare" | "flag";
type StepStatus = "pending" | "running" | "done";

interface PlanStep {
  key: string;
  kind: StepKind;
  taskId?: string; // for execute / prepare
  title: string;
  detail: string;
  assigneeId?: string; // for flag
  dueDate?: string; // for flag
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Build the copilot's plan from the deal's *current* state. Pure — no dispatch. */
function buildPlan(deal: Deal): PlanStep[] {
  const stageTasks = deal.tasks.filter((t) => t.stageId === deal.stageId);
  const steps: PlanStep[] = [];

  // 1. Routine work the copilot can just do: open, non-gate, non-sign-off, and
  // not one of its own escalations (it never closes what it flagged for a human).
  for (const t of stageTasks) {
    if (t.status !== "done" && !t.blocking && !t.requiresApproval && t.origin !== "copilot") {
      steps.push({
        key: `exec-${t.id}`,
        kind: "execute",
        taskId: t.id,
        title: t.title,
        detail: "routine — copilot completes",
      });
    }
  }

  // 2. Gate / sign-off work: tee it up, but leave the decision to a human.
  for (const t of stageTasks) {
    if (t.status === "todo" && (t.blocking || t.requiresApproval)) {
      steps.push({
        key: `prep-${t.id}`,
        kind: "prepare",
        taskId: t.id,
        title: t.title,
        detail: t.blocking ? "gate — teed up for you" : "sign-off — teed up for you",
      });
    }
  }

  // 3. Issues the copilot detects: a stale document (a dependency is newer).
  // Create a follow-up task, deduped against titles that already exist so
  // re-running never piles up duplicates.
  const existingTitles = new Set(deal.tasks.map((t) => t.title.toLowerCase()));
  const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  for (const d of deal.docs) {
    if (d.deleted) continue;
    const stale = d.dependsOn.some((depId) => {
      const dep = deal.docs.find((x) => x.id === depId && !x.deleted);
      return dep && latestVersionDate(dep) > latestVersionDate(d);
    });
    if (!stale) continue;
    const title = `Refresh "${d.name}" — a dependency was updated`;
    if (existingTitles.has(title.toLowerCase())) continue;
    existingTitles.add(title.toLowerCase());
    steps.push({
      key: `flag-${d.id}`,
      kind: "flag",
      title,
      detail: `${d.name} may be out of date`,
      assigneeId: d.ownerId,
      dueDate: due,
    });
  }

  return steps;
}

const KIND_META: Record<StepKind, { icon: string; label: string }> = {
  execute: { icon: "✓", label: "Executed" },
  prepare: { icon: "→", label: "Teed up" },
  flag: { icon: "!", label: "Flagged" },
};

export function Copilot({ deal, onGoChecklist }: { deal: Deal; onGoChecklist: () => void }) {
  const { state, dispatch } = useStore();
  const stages = state.stages;
  const idx = stageIndex(deal.stageId, stages);
  const stage = stages[idx];

  // What the copilot *would* do, computed live from the deal while idle.
  const preview = useMemo(() => buildPlan(deal), [deal]);

  // A snapshot of the plan taken when Run is pressed, with animation status.
  const [steps, setSteps] = useState<(PlanStep & { status: StepStatus })[] | null>(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const setStepStatus = (key: string, status: StepStatus) =>
    setSteps((prev) => (prev ? prev.map((s) => (s.key === key ? { ...s, status } : s)) : prev));

  async function run() {
    if (runningRef.current) return;
    const plan = buildPlan(deal);
    if (plan.length === 0) {
      toast("Nothing to run — the copilot found no routine work in this stage");
      return;
    }
    runningRef.current = true;
    setRunning(true);
    setSteps(plan.map((s) => ({ ...s, status: "pending" as StepStatus })));

    dispatch({ type: "copilotStart", dealId: deal.id });
    await sleep(450);

    let executed = 0;
    let prepared = 0;
    let flagged = 0;

    for (const step of plan) {
      setStepStatus(step.key, "running");
      await sleep(520);
      if (step.kind === "execute" && step.taskId) {
        dispatch({
          type: "copilotSetTaskStatus",
          dealId: deal.id,
          taskId: step.taskId,
          status: "in_progress",
          note: `picked up "${step.title}"`,
        });
        await sleep(340);
        dispatch({
          type: "copilotSetTaskStatus",
          dealId: deal.id,
          taskId: step.taskId,
          status: "done",
          note: `completed "${step.title}"`,
        });
        executed++;
      } else if (step.kind === "prepare" && step.taskId) {
        dispatch({
          type: "copilotSetTaskStatus",
          dealId: deal.id,
          taskId: step.taskId,
          status: "in_progress",
          note: `started "${step.title}" — left for your sign-off`,
        });
        prepared++;
      } else if (step.kind === "flag" && step.assigneeId && step.dueDate) {
        dispatch({
          type: "copilotFlag",
          dealId: deal.id,
          title: step.title,
          assigneeId: step.assigneeId,
          dueDate: step.dueDate,
        });
        flagged++;
      }
      setStepStatus(step.key, "done");
      await sleep(220);
    }

    dispatch({
      type: "copilotFinish",
      dealId: deal.id,
      summary: `finished the run — ${executed} executed, ${prepared} teed up, ${flagged} flagged`,
    });
    toast("Copilot run complete — see what's awaiting you");
    runningRef.current = false;
    setRunning(false);
  }

  // The human gate, always computed from the live deal: what only a person
  // should decide. This is where the copilot hands the deal back.
  const openGates = deal.tasks.filter(
    (t) => t.stageId === deal.stageId && t.blocking && t.status !== "done"
  );
  const needSignoff = deal.tasks.filter(
    (t) => t.status === "done" && t.requiresApproval && !t.approvedById
  );
  const canAdvance = idx >= 0 && idx < stages.length - 1 && openGates.length === 0;
  const isFinal = idx >= stages.length - 1;

  const counts = { execute: 0, prepare: 0, flag: 0 };
  for (const s of preview) counts[s.kind]++;

  return (
    <div className="copilot">
      <section className="panel copilot-panel">
        <h3>
          <span className="ai-dot" /> Deal Copilot
          <span className="subtle" style={{ fontWeight: 400, marginLeft: 8 }}>
            autonomous execution · human gate
          </span>
        </h3>
        <p className="copilot-lede">
          The copilot runs the routine work of <strong>{stage?.label ?? "this stage"}</strong>, tees
          up what needs a human, and flags what looks stale — then stops at the gate. It never signs
          off, never advances a stage. Every action is logged in Activity.
        </p>

        <div className="copilot-chips">
          <div className="copilot-chip">
            <div className="copilot-chip-num">{counts.execute}</div>
            <div className="copilot-chip-label">to execute</div>
          </div>
          <div className="copilot-chip">
            <div className="copilot-chip-num">{counts.prepare}</div>
            <div className="copilot-chip-label">to tee up</div>
          </div>
          <div className="copilot-chip">
            <div className="copilot-chip-num">{counts.flag}</div>
            <div className="copilot-chip-label">to flag</div>
          </div>
          <button className="btn btn-primary copilot-run" disabled={running} onClick={run}>
            {running ? "Running…" : steps ? "Run again" : "Run copilot"}
          </button>
        </div>

        {steps === null ? (
          preview.length === 0 ? (
            <p className="copilot-empty">
              No routine work in this stage right now. Add tasks from the playbook, or the copilot
              has nothing to pick up.
            </p>
          ) : (
            <ul className="copilot-plan">
              {preview.map((s) => (
                <li key={s.key} className={`copilot-step step-${s.kind}`}>
                  <span className="copilot-step-icon">{KIND_META[s.kind].icon}</span>
                  <span className="copilot-step-body">
                    <span className="copilot-step-title">{s.title}</span>
                    <span className="copilot-step-detail">{s.detail}</span>
                  </span>
                  <Badge kind="copilot-kind">{KIND_META[s.kind].label}</Badge>
                </li>
              ))}
            </ul>
          )
        ) : (
          <ul className="copilot-plan">
            {steps.map((s) => (
              <li key={s.key} className={`copilot-step step-${s.kind} status-${s.status}`}>
                <span className="copilot-step-icon">
                  {s.status === "running" ? <span className="copilot-spinner" /> : KIND_META[s.kind].icon}
                </span>
                <span className="copilot-step-body">
                  <span className="copilot-step-title">{s.title}</span>
                  <span className="copilot-step-detail">
                    {s.status === "running" ? "working…" : s.detail}
                  </span>
                </span>
                <Badge kind="copilot-kind">{KIND_META[s.kind].label}</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel copilot-gate">
        <h3>
          🔒 Awaiting you
          <span className="subtle" style={{ fontWeight: 400, marginLeft: 8 }}>
            the copilot can't cross this line
          </span>
        </h3>

        {openGates.length === 0 && needSignoff.length === 0 && (isFinal || canAdvance) ? (
          <p className="all-clear">
            ✓ Nothing waiting on you here.
            {canAdvance && !isFinal ? " The stage is clear to advance." : ""}
          </p>
        ) : (
          <div className="gate-list">
            {openGates.map((t) => (
              <GateRow
                key={t.id}
                icon="gate"
                title={t.title}
                meta={`gate task · due ${fmtDate(t.dueDate)} (${relDays(t.dueDate).label})`}
                action={
                  <button className="btn btn-mini" onClick={onGoChecklist}>
                    Open in checklist
                  </button>
                }
              />
            ))}
            {needSignoff.map((t) => (
              <SignoffRow key={t.id} deal={deal} task={t} />
            ))}
            {canAdvance && !isFinal && (
              <GateRow
                icon="advance"
                title={`Ready to advance to ${stages[idx + 1]?.label}`}
                meta="no open gate tasks — your call to move the deal on"
                action={
                  <button
                    className="btn btn-primary btn-mini"
                    onClick={() => {
                      dispatch({ type: "advanceStage", dealId: deal.id });
                      toast(`${deal.codename} advanced to ${stages[idx + 1].label}`);
                    }}
                  >
                    Advance
                  </button>
                }
              />
            )}
          </div>
        )}
      </section>
    </div>
  );
}

function GateRow({
  icon,
  title,
  meta,
  action,
}: {
  icon: "gate" | "advance" | "signoff";
  title: string;
  meta: string;
  action: React.ReactNode;
}) {
  const glyph = icon === "advance" ? "→" : icon === "signoff" ? "✍" : "🔒";
  return (
    <div className={`gate-row gate-${icon}`}>
      <span className="gate-glyph">{glyph}</span>
      <div className="gate-main">
        <div className="gate-title">{title}</div>
        <div className="gate-meta">{meta}</div>
      </div>
      <div className="gate-action">{action}</div>
    </div>
  );
}

/** A done-but-unapproved task. Reuses the store's approval rules, including
 *  separation of duties — you can't sign off your own work. */
function SignoffRow({ deal, task }: { deal: Deal; task: Task }) {
  const { state, dispatch } = useStore();
  const mine = task.assigneeId === state.currentUserId;
  const assignee = state.members.find((m) => m.id === task.assigneeId);
  return (
    <GateRow
      icon="signoff"
      title={task.title}
      meta={`done by ${assignee?.name.split(" ")[0] ?? "someone"} · needs sign-off`}
      action={
        mine ? (
          <span className="subtle" title="Separation of duties — someone else must sign this off">
            awaiting another
          </span>
        ) : (
          <button
            className="btn btn-mini"
            onClick={() => {
              dispatch({ type: "approveTask", dealId: deal.id, taskId: task.id });
              toast(`Approved: ${task.title}`);
            }}
          >
            Approve
          </button>
        )
      }
    />
  );
}
