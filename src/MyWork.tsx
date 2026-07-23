import React from "react";
import { useStore } from "./store";
import { Deal, Task } from "./types";
import { Avatar, Badge, EmptyState, fmtDate, mentionsMe, relDays, RichText, toast } from "./ui";

interface WorkItem {
  deal: Deal;
  task: Task;
}

function bucket(items: WorkItem[]) {
  const today = new Date().toISOString().slice(0, 10);
  const weekOut = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  return {
    overdue: items.filter((i) => i.task.dueDate < today),
    thisWeek: items.filter((i) => i.task.dueDate >= today && i.task.dueDate <= weekOut),
    later: items.filter((i) => i.task.dueDate > weekOut),
  };
}

function WorkRow({ item, onOpen }: { item: WorkItem; onOpen: (dealId: string, tab?: string) => void }) {
  const { dispatch } = useStore();
  const { deal, task } = item;
  const due = relDays(task.dueDate);
  return (
    <div className="task-row">
      <input
        type="checkbox"
        checked={false}
        onChange={() => {
          dispatch({ type: "setTaskStatus", dealId: deal.id, taskId: task.id, status: "done" });
          toast(`Done: ${task.title}`);
        }}
      />
      <div className="task-main">
        <div className="task-title">
          {task.title}
          {task.blocking && <Badge kind="blocking">gate</Badge>}
        </div>
        <div className="task-meta">
          <button className="deal-chip" onClick={() => onOpen(deal.id, "checklist")}>
            {deal.codename}
          </button>
          <span className={due.overdue ? "overdue" : ""}>
            due {fmtDate(task.dueDate)} ({due.label})
          </span>
          {task.status === "in_progress" && <Badge kind="progress">in progress</Badge>}
        </div>
      </div>
    </div>
  );
}

export function MyWork({ onOpen }: { onOpen: (dealId: string, tab?: string) => void }) {
  const { state, dispatch } = useStore();
  const me = state.members.find((m) => m.id === state.currentUserId)!;

  const myTasks: WorkItem[] = state.deals.flatMap((deal) =>
    deal.tasks
      .filter((t) => t.assigneeId === me.id && t.status !== "done")
      .map((task) => ({ deal, task }))
  );
  const { overdue, thisWeek, later } = bucket(myTasks);

  const pendingSignoffs = state.deals.flatMap((deal) =>
    deal.tasks
      // Only sign-offs I can actually give — not my own work (separation of duties).
      .filter(
        (t) =>
          t.status === "done" &&
          t.requiresApproval &&
          !t.approvedById &&
          t.assigneeId !== me.id
      )
      .map((task) => ({ deal, task }))
  );

  const myMentions = state.deals.flatMap((deal) =>
    deal.comments
      .filter((c) => !c.resolved && c.authorId !== me.id && mentionsMe(c.text, me))
      .map((comment) => ({ deal, comment }))
  );

  const sections: { title: string; items: WorkItem[]; tone?: string }[] = [
    { title: `Overdue — ${overdue.length}`, items: overdue, tone: "danger" },
    { title: `Due this week — ${thisWeek.length}`, items: thisWeek },
    { title: `Later — ${later.length}`, items: later },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>My Work</h1>
          <p className="subtle">
            Everything assigned to you across {state.deals.length} deals — sorted by urgency.
          </p>
        </div>
      </div>

      {myTasks.length === 0 ? (
        <section className="panel">
          <EmptyState
            icon="✓"
            title="You're clear."
            hint="Nothing assigned to you is outstanding. Enjoy it while it lasts."
          />
        </section>
      ) : (
        <section className="panel">
          {sections.map(
            (s) =>
              s.items.length > 0 && (
                <div key={s.title}>
                  <h4 className={`group-head ${s.tone === "danger" ? "group-danger" : ""}`}>{s.title}</h4>
                  {s.items
                    .sort((a, b) => a.task.dueDate.localeCompare(b.task.dueDate))
                    .map((i) => (
                      <WorkRow key={i.task.id} item={i} onOpen={onOpen} />
                    ))}
                </div>
              )
          )}
        </section>
      )}

      {pendingSignoffs.length > 0 && (
        <section className="panel">
          <h3>Awaiting sign-off — {pendingSignoffs.length}</h3>
          <p className="subtle" style={{ marginTop: -6, marginBottom: 10 }}>
            Completed work that has no senior approval yet, across all deals.
          </p>
          {pendingSignoffs.map(({ deal, task }) => {
            const assignee = state.members.find((m) => m.id === task.assigneeId);
            return (
              <div key={task.id} className="task-row">
                {assignee && <Avatar member={assignee} size={24} />}
                <div className="task-main">
                  <div className="task-title">{task.title}</div>
                  <div className="task-meta">
                    <button className="deal-chip" onClick={() => onOpen(deal.id, "checklist")}>
                      {deal.codename}
                    </button>
                    <span>done, unapproved</span>
                  </div>
                </div>
                <button
                  className="btn btn-mini"
                  onClick={() => {
                    dispatch({ type: "approveTask", dealId: deal.id, taskId: task.id });
                    toast(`Approved: ${task.title}`);
                  }}
                >
                  Approve
                </button>
              </div>
            );
          })}
        </section>
      )}

      {myMentions.length > 0 && (
        <section className="panel">
          <h3>Mentions — {myMentions.length}</h3>
          {myMentions.map(({ deal, comment }) => {
            const author = state.members.find((m) => m.id === comment.authorId);
            return (
              <div key={comment.id} className="comment">
                {author && <Avatar member={author} />}
                <div className="comment-main">
                  <div className="comment-meta">
                    <strong>{author?.name}</strong>
                    <button className="deal-chip" onClick={() => onOpen(deal.id, "comments")}>
                      {deal.codename}
                    </button>
                    <span className="subtle">on {comment.target}</span>
                  </div>
                  <div className="comment-text">
                    <RichText text={comment.text} members={state.members} />
                  </div>
                </div>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
