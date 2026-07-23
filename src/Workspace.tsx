import React, { useMemo, useState } from "react";
import {
  computeInsights,
  Deal,
  Doc,
  DocType,
  insightTab,
  latestVersionDate,
  STAGES,
  stageIndex,
  Task,
} from "./types";
import { useStore } from "./store";
import {
  Avatar,
  AvatarStack,
  Badge,
  EmptyState,
  fmtDate,
  fmtDateTime,
  fmtMoney,
  InsightCard,
  relDays,
  RichText,
  toast,
} from "./ui";

type Tab = "overview" | "checklist" | "documents" | "comments" | "activity";

const DOC_TYPES: DocType[] = ["Model", "Pitch Book", "Legal", "Diligence", "Memo", "Data"];

function StageStepper({ deal }: { deal: Deal }) {
  const idx = stageIndex(deal.stageId);
  return (
    <div className="stepper">
      {STAGES.map((s, i) => (
        <div key={s.id} className={`step ${i < idx ? "done" : i === idx ? "current" : ""}`}>
          <div className="step-dot">{i < idx ? "✓" : i + 1}</div>
          <div className="step-label">{s.short}</div>
          {i < STAGES.length - 1 && <div className="step-line" />}
        </div>
      ))}
    </div>
  );
}

function TaskRow({ deal, task }: { deal: Deal; task: Task }) {
  const { state, dispatch } = useStore();
  const assignee = state.members.find((m) => m.id === task.assigneeId);
  const approver = task.approvedById ? state.members.find((m) => m.id === task.approvedById) : null;
  const due = relDays(task.dueDate);
  const stage = STAGES[stageIndex(task.stageId)];

  return (
    <div className={`task-row ${task.status === "done" ? "task-done" : ""}`}>
      <input
        type="checkbox"
        checked={task.status === "done"}
        onChange={(e) =>
          dispatch({
            type: "setTaskStatus",
            dealId: deal.id,
            taskId: task.id,
            status: e.target.checked ? "done" : "in_progress",
          })
        }
      />
      <div className="task-main">
        <div className="task-title">
          {task.title}
          {task.blocking && <Badge kind="blocking">gate</Badge>}
        </div>
        <div className="task-meta">
          <span>{stage.short}</span>
          <span className={due.overdue && task.status !== "done" ? "overdue" : ""}>
            due {fmtDate(task.dueDate)} ({due.label})
          </span>
          {task.status === "in_progress" && <Badge kind="progress">in progress</Badge>}
          {task.requiresApproval &&
            (approver ? (
              <span className="approved">✓ approved by {approver.name.split(" ")[0]}</span>
            ) : task.status === "done" ? (
              <button
                className="btn btn-mini"
                onClick={() => {
                  dispatch({ type: "approveTask", dealId: deal.id, taskId: task.id });
                  toast(`Approved: ${task.title}`);
                }}
              >
                Approve
              </button>
            ) : (
              <span className="subtle">needs sign-off</span>
            ))}
        </div>
      </div>
      {assignee && <Avatar member={assignee} />}
    </div>
  );
}

function AddTaskForm({ deal }: { deal: Deal }) {
  const { state, dispatch } = useStore();
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(state.currentUserId);
  const [dueDate, setDueDate] = useState(() => new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [blocking, setBlocking] = useState(false);
  const [requiresApproval, setRequiresApproval] = useState(false);

  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        dispatch({ type: "addTask", dealId: deal.id, title: title.trim(), assigneeId, dueDate, blocking, requiresApproval });
        setTitle("");
      }}
    >
      <input placeholder="New task…" value={title} onChange={(e) => setTitle(e.target.value)} />
      <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
        {state.members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name} ({m.role})
          </option>
        ))}
      </select>
      <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      <label className="check">
        <input type="checkbox" checked={blocking} onChange={(e) => setBlocking(e.target.checked)} /> gate
      </label>
      <label className="check">
        <input type="checkbox" checked={requiresApproval} onChange={(e) => setRequiresApproval(e.target.checked)} /> sign-off
      </label>
      <button className="btn btn-primary" type="submit">
        Add
      </button>
    </form>
  );
}

function DocCard({ deal, doc }: { deal: Deal; doc: Doc }) {
  const { state, dispatch } = useStore();
  const [expanded, setExpanded] = useState(false);
  const [note, setNote] = useState("");
  const owner = state.members.find((m) => m.id === doc.ownerId);
  const latest = doc.versions[doc.versions.length - 1];
  const stale = doc.dependsOn.some((depId) => {
    const dep = deal.docs.find((x) => x.id === depId);
    return dep && latestVersionDate(dep) > latestVersionDate(doc);
  });

  return (
    <div className="doc-card">
      <div className="doc-head" onClick={() => setExpanded(!expanded)}>
        <div className="doc-title-wrap">
          <span className="doc-name">{doc.name}</span>
          <span className="doc-sub">
            v{latest.v} · {fmtDateTime(latest.date)} · {owner?.name}
          </span>
        </div>
        <div className="doc-badges">
          {stale && <Badge kind="alert">stale</Badge>}
          <Badge kind="type">{doc.type}</Badge>
          <Badge kind={doc.status}>{doc.status.replace("_", " ")}</Badge>
          <span className="chevron">{expanded ? "▾" : "▸"}</span>
        </div>
      </div>
      {expanded && (
        <div className="doc-body">
          <div className="version-list">
            {[...doc.versions].reverse().map((v) => {
              const author = state.members.find((m) => m.id === v.authorId);
              return (
                <div key={v.v} className="version-row">
                  <span className="version-num">v{v.v}</span>
                  <span className="version-note">{v.note}</span>
                  <span className="version-meta">
                    {author?.name.split(" ")[0]} · {fmtDateTime(v.date)}
                  </span>
                </div>
              );
            })}
          </div>
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              dispatch({ type: "addDocVersion", dealId: deal.id, docId: doc.id, note: note.trim() });
              toast(`Published ${doc.name} v${latest.v + 1}`);
              setNote("");
            }}
          >
            <input placeholder="What changed in this version?" value={note} onChange={(e) => setNote(e.target.value)} />
            <button className="btn" type="submit">
              Publish new version
            </button>
            {doc.status !== "approved" && (
              <button
                className="btn"
                type="button"
                onClick={() =>
                  dispatch({
                    type: "setDocStatus",
                    dealId: deal.id,
                    docId: doc.id,
                    status: doc.status === "draft" ? "in_review" : "approved",
                  })
                }
              >
                {doc.status === "draft" ? "Send for review" : "Mark approved"}
              </button>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

function AddDocForm({ deal }: { deal: Deal }) {
  const { dispatch } = useStore();
  const [name, setName] = useState("");
  const [docType, setDocType] = useState<DocType>("Model");
  const [dependsOn, setDependsOn] = useState<string>("");

  return (
    <form
      className="inline-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        dispatch({
          type: "addDoc",
          dealId: deal.id,
          name: name.trim(),
          docType,
          note: "Initial version",
          dependsOn: dependsOn ? [dependsOn] : [],
        });
        setName("");
        setDependsOn("");
      }}
    >
      <input placeholder="New document name…" value={name} onChange={(e) => setName(e.target.value)} />
      <select value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
        {DOC_TYPES.map((t) => (
          <option key={t}>{t}</option>
        ))}
      </select>
      <select value={dependsOn} onChange={(e) => setDependsOn(e.target.value)}>
        <option value="">no dependency</option>
        {deal.docs.map((d) => (
          <option key={d.id} value={d.id}>
            depends on: {d.name}
          </option>
        ))}
      </select>
      <button className="btn btn-primary" type="submit">
        Add
      </button>
    </form>
  );
}

export function Workspace({
  dealId,
  onBack,
  initialTab,
}: {
  dealId: string;
  onBack: () => void;
  initialTab?: string;
}) {
  const { state, dispatch } = useStore();
  const deal = state.deals.find((d) => d.id === dealId);
  const [tab, setTab] = useState<Tab>((initialTab as Tab) || "overview");
  const [commentText, setCommentText] = useState("");
  const [commentTarget, setCommentTarget] = useState("");
  const [breakGlass, setBreakGlass] = useState(false);
  const [overrideReason, setOverrideReason] = useState("");

  const insights = useMemo(() => (deal ? computeInsights(deal, new Date()) : []), [deal]);
  if (!deal) return null;

  const idx = stageIndex(deal.stageId);
  const lead = state.members.find((m) => m.id === deal.leadId);
  const team = state.members.filter((m) => deal.teamIds.includes(m.id));
  const blockers = deal.tasks.filter((t) => t.stageId === deal.stageId && t.blocking && t.status !== "done");
  const canAdvance = idx < STAGES.length - 1 && blockers.length === 0;
  const unresolved = deal.comments.filter((c) => !c.resolved);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "checklist", label: "Checklist", count: deal.tasks.filter((t) => t.status !== "done").length },
    { id: "documents", label: "Documents", count: deal.docs.length },
    { id: "comments", label: "Comments", count: unresolved.length },
    { id: "activity", label: "Activity" },
  ];

  return (
    <div className="workspace">
      <button className="btn-link" onClick={onBack}>
        ← Pipeline
      </button>
      <div className="ws-header">
        <div>
          <div className="ws-title-row">
            <h1>{deal.name}</h1>
            <Badge kind="type">{deal.type}</Badge>
            <span className="deal-value big">{fmtMoney(deal.valueM)}</span>
          </div>
          <p className="subtle">
            {deal.client} · led by {lead?.name} · target close {fmtDate(deal.targetClose)} (
            {relDays(deal.targetClose).label})
          </p>
        </div>
        <div className="ws-header-right">
          <AvatarStack members={team} max={5} />
          <button
            className="btn btn-primary"
            disabled={!canAdvance}
            title={
              canAdvance
                ? `Advance to ${STAGES[idx + 1]?.label}`
                : blockers.length > 0
                  ? `Blocked by: ${blockers.map((b) => b.title).join(", ")}`
                  : "Deal is at final stage"
            }
            onClick={() => {
              dispatch({ type: "advanceStage", dealId: deal.id });
              toast(`${deal.codename} advanced to ${STAGES[idx + 1].label}`);
            }}
          >
            {idx >= STAGES.length - 1 ? "Final stage" : `Advance to ${STAGES[idx + 1].short} →`}
          </button>
          {blockers.length > 0 && idx < STAGES.length - 1 && (
            <button
              className="btn btn-breakglass"
              title="Advance anyway, past the open gate — logged with a mandatory reason"
              onClick={() => {
                setOverrideReason("");
                setBreakGlass(true);
              }}
            >
              🔓 Break glass
            </button>
          )}
        </div>
      </div>

      <StageStepper deal={deal} />

      {blockers.length > 0 && (
        <div className="gate-banner">
          🔒 Stage gate: {blockers.length} blocking task{blockers.length > 1 ? "s" : ""} must be
          completed before advancing — {blockers.map((b) => `"${b.title}"`).join(", ")}.{" "}
          <span className="gate-banner-note">
            Under time pressure you can <strong>Break glass</strong> to advance anyway — it's logged
            and stays flagged until this work is done.
          </span>
        </div>
      )}

      {breakGlass && (
        <div className="modal-overlay" onClick={() => setBreakGlass(false)}>
          <div className="modal breakglass-modal" onClick={(e) => e.stopPropagation()}>
            <h2>🔓 Break glass — override stage gate</h2>
            <p className="subtle">
              You're advancing <strong>{deal.name}</strong> from{" "}
              <strong>{STAGES[idx].label}</strong> to{" "}
              <strong>{STAGES[idx + 1]?.label}</strong> past {blockers.length} unfinished gate task
              {blockers.length > 1 ? "s" : ""}. This is recorded against your name and stays flagged
              in Deal Review until the skipped work is completed.
            </p>
            <ul className="breakglass-skiplist">
              {blockers.map((b) => (
                <li key={b.id}>{b.title}</li>
              ))}
            </ul>
            <label className="field-label">Reason (required)</label>
            <textarea
              rows={3}
              autoFocus
              placeholder="e.g. Client demanded revised model in 30 min; MD unreachable in transit. Escalated to Rohan by phone."
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
            />
            <div className="modal-actions">
              <button className="btn" onClick={() => setBreakGlass(false)}>
                Cancel
              </button>
              <button
                className="btn btn-breakglass"
                disabled={!overrideReason.trim()}
                onClick={() => {
                  dispatch({ type: "overrideStage", dealId: deal.id, reason: overrideReason });
                  toast(`${deal.codename}: gate overridden → ${STAGES[idx + 1].label}`);
                  setBreakGlass(false);
                }}
              >
                Override & advance
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count !== undefined && t.count > 0 && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="two-col">
          <div>
            <section className="panel">
              <h3>Deal summary</h3>
              <p>{deal.summary}</p>
              <div className="stat-row">
                <div className="stat">
                  <div className="stat-value">{deal.tasks.filter((t) => t.status === "done").length}/{deal.tasks.length}</div>
                  <div className="stat-label">tasks done</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{deal.docs.length}</div>
                  <div className="stat-label">documents</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{unresolved.length}</div>
                  <div className="stat-label">open comments</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{deal.docs.reduce((s, d) => s + d.versions.length, 0)}</div>
                  <div className="stat-label">versions</div>
                </div>
              </div>
            </section>
            <section className="panel">
              <h3>Team</h3>
              {team.map((m) => (
                <div key={m.id} className="team-row">
                  <Avatar member={m} />
                  <span>{m.name}</span>
                  <span className="subtle">{m.role}</span>
                  {m.id === deal.leadId && <Badge kind="type">lead</Badge>}
                </div>
              ))}
            </section>
          </div>
          <section className="panel panel-insights">
            <h3>
              <span className="ai-dot" /> Deal Review
              <span className="subtle" style={{ fontWeight: 400, marginLeft: 8 }}>
                automated checks
              </span>
            </h3>
            {insights.length === 0 ? (
              <p className="all-clear">✓ No issues detected. Everything is consistent and on track.</p>
            ) : (
              insights.map((i) => (
                <InsightCard key={i.id} insight={i} onClick={() => setTab(insightTab(i.id))} />
              ))
            )}
          </section>
        </div>
      )}

      {tab === "checklist" && (
        <section className="panel">
          {deal.tasks.length === 0 ? (
            <EmptyState
              icon="☑"
              title="No tasks yet"
              hint={`Start from the standard ${deal.type} playbook — stage-gated tasks, assigned by role, with due dates.`}
              action={
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    dispatch({ type: "applyTemplate", dealId: deal.id });
                    toast(`${deal.type} playbook applied`);
                  }}
                >
                  Apply {deal.type} playbook
                </button>
              }
            />
          ) : (
            <>
              <AddTaskForm deal={deal} />
              {STAGES.filter((s) => deal.tasks.some((t) => t.stageId === s.id)).map((s) => (
                <div key={s.id}>
                  <h4 className="group-head">{s.label}</h4>
                  {deal.tasks
                    .filter((t) => t.stageId === s.id)
                    .map((t) => (
                      <TaskRow key={t.id} deal={deal} task={t} />
                    ))}
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "documents" && (
        <section className="panel">
          <AddDocForm deal={deal} />
          {deal.docs.map((d) => (
            <DocCard key={d.id} deal={deal} doc={d} />
          ))}
          {deal.docs.length === 0 && (
            <EmptyState
              icon="▤"
              title="No documents yet"
              hint="Add the model, deck, or legal doc the team is working from. Declare dependencies so stale versions get flagged automatically."
            />
          )}
        </section>
      )}

      {tab === "comments" && (
        <section className="panel">
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!commentText.trim()) return;
              dispatch({
                type: "addComment",
                dealId: deal.id,
                text: commentText.trim(),
                target: commentTarget || "General",
              });
              setCommentText("");
            }}
          >
            <input
              placeholder="Add a comment… (@name to mention)"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
            />
            <select value={commentTarget} onChange={(e) => setCommentTarget(e.target.value)}>
              <option value="">General</option>
              {deal.docs.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              Post
            </button>
          </form>
          {[...deal.comments].reverse().map((c) => {
            const author = state.members.find((m) => m.id === c.authorId);
            return (
              <div key={c.id} className={`comment ${c.resolved ? "comment-resolved" : ""}`}>
                {author && <Avatar member={author} />}
                <div className="comment-main">
                  <div className="comment-meta">
                    <strong>{author?.name}</strong>
                    <span className="subtle">
                      on {c.target} · {fmtDateTime(c.createdAt)}
                    </span>
                  </div>
                  <div className="comment-text">
                    <RichText text={c.text} members={state.members} />
                  </div>
                </div>
                <button
                  className="btn btn-mini"
                  onClick={() => dispatch({ type: "toggleComment", dealId: deal.id, commentId: c.id })}
                >
                  {c.resolved ? "Reopen" : "Resolve"}
                </button>
              </div>
            );
          })}
          {deal.comments.length === 0 && (
            <EmptyState
              icon="◗"
              title="No comments yet"
              hint="Feedback lives here instead of email threads — every comment tracks resolution, so nothing gets dropped."
            />
          )}
        </section>
      )}

      {tab === "activity" && (
        <section className="panel">
          {[...deal.activity].reverse().map((a) => {
            const actor = state.members.find((m) => m.id === a.actorId);
            return (
              <div key={a.id} className={`activity-row ${a.kind === "override" ? "activity-override" : ""}`}>
                {actor && <Avatar member={actor} size={22} />}
                <span>
                  {a.kind === "override" && <span className="activity-badge">OVERRIDE</span>}
                  <strong>{actor?.name}</strong> {a.text}
                </span>
                <span className="subtle activity-ts">{fmtDateTime(a.ts)}</span>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
