import React, { useMemo, useState } from "react";
import {
  computeInsights,
  Deal,
  Doc,
  DocType,
  FileData,
  insightTab,
  latestVersionDate,
  stageIndex,
  Task,
} from "./types";
import { COPILOT_ID, useStore } from "./store";
import { Copilot } from "./Copilot";
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

type Tab = "overview" | "copilot" | "checklist" | "documents" | "comments" | "activity";

const DOC_TYPES: DocType[] = ["Model", "Pitch Book", "Legal", "Diligence", "Memo", "Data"];

// Files are stored inline in localStorage as base64, so keep them modest.
const MAX_FILE_BYTES = 2 * 1024 * 1024; // 2 MB

function readFileData(file: File): Promise<FileData | null> {
  return new Promise((resolve) => {
    if (file.size > MAX_FILE_BYTES) {
      toast(`"${file.name}" is too large — 2 MB max in this in-browser build`);
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      resolve({ name: file.name, type: file.type, size: file.size, dataUrl: String(reader.result) });
    reader.onerror = () => {
      toast("Couldn't read that file");
      resolve(null);
    };
    reader.readAsDataURL(file);
  });
}

function fmtBytes(n?: number): string {
  if (!n) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function StageStepper({ deal }: { deal: Deal }) {
  const { state } = useStore();
  const stages = state.stages;
  const idx = stageIndex(deal.stageId, stages);
  return (
    <div className="stepper">
      {stages.map((s, i) => (
        <div key={s.id} className={`step ${i < idx ? "done" : i === idx ? "current" : ""}`}>
          <div className="step-dot">{i < idx ? "✓" : i + 1}</div>
          <div className="step-label">{s.short}</div>
          {i < stages.length - 1 && <div className="step-line" />}
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
  const stage = state.stages[stageIndex(task.stageId, state.stages)];

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
          {task.origin === "copilot" && <Badge kind="copilot-kind">copilot</Badge>}
        </div>
        <div className="task-meta">
          <span>{stage?.short ?? task.stageId}</span>
          <span className={due.overdue && task.status !== "done" ? "overdue" : ""}>
            due {fmtDate(task.dueDate)} ({due.label})
          </span>
          {task.status === "in_progress" && <Badge kind="progress">in progress</Badge>}
          {task.requiresApproval &&
            (approver ? (
              <span className="approved">
                ✓ approved by {approver.name.split(" ")[0]}
                {task.approvedById === state.currentUserId && (
                  <button
                    className="btn-link revoke-link"
                    title="Withdraw your sign-off"
                    onClick={() => dispatch({ type: "revokeApproval", dealId: deal.id, taskId: task.id })}
                  >
                    withdraw
                  </button>
                )}
              </span>
            ) : task.status === "done" ? (
              task.assigneeId === state.currentUserId ? (
                <span className="subtle" title="Separation of duties — someone else must sign this off">
                  awaiting another's sign-off
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
  const [file, setFile] = useState<FileData | null>(null);
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
                  <span className="version-note">
                    {v.note}
                    {v.dataUrl && (
                      <a
                        className="doc-download"
                        href={v.dataUrl}
                        download={v.fileName}
                        onClick={(e) => e.stopPropagation()}
                        title={`Download ${v.fileName} (${fmtBytes(v.fileSize)})`}
                      >
                        ⬇ {v.fileName} <span className="subtle">{fmtBytes(v.fileSize)}</span>
                      </a>
                    )}
                  </span>
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
              if (!note.trim() && !file) return;
              dispatch({
                type: "addDocVersion",
                dealId: deal.id,
                docId: doc.id,
                note: note.trim() || (file ? `Uploaded ${file.name}` : ""),
                file: file ?? undefined,
              });
              toast(`Published ${doc.name} v${latest.v + 1}`);
              setNote("");
              setFile(null);
            }}
          >
            <input placeholder="What changed in this version?" value={note} onChange={(e) => setNote(e.target.value)} />
            <label className="file-pick" title="Attach a file (optional, 2 MB max)">
              {file ? `📎 ${file.name}` : "📎 Attach file"}
              <input
                type="file"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  setFile(f ? await readFileData(f) : null);
                  e.target.value = "";
                }}
              />
            </label>
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
            <button
              className="btn btn-danger"
              type="button"
              title="Move this document to the recycle bin"
              onClick={() => {
                dispatch({ type: "deleteDoc", dealId: deal.id, docId: doc.id });
                toast(`"${doc.name}" moved to recycle bin`);
              }}
            >
              Delete
            </button>
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
  const [file, setFile] = useState<FileData | null>(null);

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
          note: file ? `Initial upload — ${file.name}` : "Initial version",
          dependsOn: dependsOn ? [dependsOn] : [],
          file: file ?? undefined,
        });
        setName("");
        setDependsOn("");
        setFile(null);
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
        {deal.docs
          .filter((d) => !d.deleted)
          .map((d) => (
            <option key={d.id} value={d.id}>
              depends on: {d.name}
            </option>
          ))}
      </select>
      <label className="file-pick" title="Attach a file (optional, 2 MB max)">
        {file ? `📎 ${file.name}` : "📎 Attach file"}
        <input
          type="file"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            setFile(f ? await readFileData(f) : null);
            e.target.value = "";
          }}
        />
      </label>
      <button className="btn btn-primary" type="submit">
        Add
      </button>
    </form>
  );
}

function RecycleBin({ deal, docs }: { deal: Deal; docs: Doc[] }) {
  const { state, dispatch } = useStore();
  const [open, setOpen] = useState(false);
  if (docs.length === 0) return null;
  return (
    <div className="recycle-bin">
      <button className="recycle-toggle" onClick={() => setOpen((o) => !o)}>
        🗑 Recycle bin ({docs.length}) {open ? "▾" : "▸"}
      </button>
      {open &&
        docs.map((d) => {
          const by = state.members.find((m) => m.id === d.deletedById);
          return (
            <div key={d.id} className="recycle-row">
              <span className="recycle-name">
                {d.name} <span className="subtle">· {d.type}</span>
              </span>
              <span className="subtle recycle-meta">
                deleted {d.deletedAt ? fmtDateTime(d.deletedAt) : ""}
                {by ? ` by ${by.name.split(" ")[0]}` : ""}
              </span>
              <div className="recycle-actions">
                <button
                  className="btn btn-mini"
                  onClick={() => {
                    dispatch({ type: "restoreDoc", dealId: deal.id, docId: d.id });
                    toast(`Restored "${d.name}"`);
                  }}
                >
                  Restore
                </button>
                <button
                  className="btn btn-mini btn-danger"
                  onClick={() => {
                    dispatch({ type: "purgeDoc", dealId: deal.id, docId: d.id });
                    toast(`Permanently deleted "${d.name}"`);
                  }}
                >
                  Delete permanently
                </button>
              </div>
            </div>
          );
        })}
    </div>
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

  const insights = useMemo(
    () => (deal ? computeInsights(deal, new Date(), state.stages) : []),
    [deal, state.stages]
  );
  if (!deal) return null;

  const stages = state.stages;
  const idx = stageIndex(deal.stageId, stages);
  const lead = state.members.find((m) => m.id === deal.leadId);
  const team = state.members.filter((m) => deal.teamIds.includes(m.id));
  const blockers = deal.tasks.filter((t) => t.stageId === deal.stageId && t.blocking && t.status !== "done");
  const canAdvance = idx >= 0 && idx < stages.length - 1 && blockers.length === 0;
  const unresolved = deal.comments.filter((c) => !c.resolved);
  // Items the copilot must leave to a human: open gate tasks + pending sign-offs.
  const awaitingYou =
    blockers.length +
    deal.tasks.filter((t) => t.status === "done" && t.requiresApproval && !t.approvedById).length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "copilot", label: "Copilot", count: awaitingYou },
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
                ? `Advance to ${stages[idx + 1]?.label}`
                : blockers.length > 0
                  ? `Blocked by: ${blockers.map((b) => b.title).join(", ")}`
                  : "Deal is at final stage"
            }
            onClick={() => {
              dispatch({ type: "advanceStage", dealId: deal.id });
              toast(`${deal.codename} advanced to ${stages[idx + 1].label}`);
            }}
          >
            {idx >= stages.length - 1 ? "Final stage" : `Advance to ${stages[idx + 1].short} →`}
          </button>
          {blockers.length > 0 && idx < stages.length - 1 && (
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
              <strong>{stages[idx].label}</strong> to{" "}
              <strong>{stages[idx + 1]?.label}</strong> past {blockers.length} unfinished gate task
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
                  toast(`${deal.codename}: gate overridden → ${stages[idx + 1].label}`);
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

      {tab === "copilot" && <Copilot deal={deal} onGoChecklist={() => setTab("checklist")} />}

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
              {state.stages.filter((s) => deal.tasks.some((t) => t.stageId === s.id)).map((s) => (
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

      {tab === "documents" &&
        (() => {
          const activeDocs = deal.docs.filter((d) => !d.deleted);
          const binned = deal.docs.filter((d) => d.deleted);
          return (
            <section className="panel">
              <AddDocForm deal={deal} />
              {activeDocs.map((d) => (
                <DocCard key={d.id} deal={deal} doc={d} />
              ))}
              {activeDocs.length === 0 && (
                <EmptyState
                  icon="▤"
                  title="No documents yet"
                  hint="Add the model, deck, or legal doc the team is working from — attach the actual file, and declare dependencies so stale versions get flagged automatically."
                />
              )}
              <RecycleBin deal={deal} docs={binned} />
            </section>
          );
        })()}

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
            const isCopilot = a.kind === "copilot" || a.actorId === COPILOT_ID;
            const actor = state.members.find((m) => m.id === a.actorId);
            return (
              <div
                key={a.id}
                className={`activity-row ${a.kind === "override" ? "activity-override" : ""} ${
                  isCopilot ? "activity-copilot" : ""
                }`}
              >
                {isCopilot ? (
                  <span className="copilot-mark" title="Deal Copilot" aria-hidden="true">
                    ◆
                  </span>
                ) : (
                  actor && <Avatar member={actor} size={22} />
                )}
                <span>
                  {a.kind === "override" && <span className="activity-badge">OVERRIDE</span>}
                  {isCopilot && <span className="activity-badge copilot-badge">COPILOT</span>}
                  <strong>{isCopilot ? "Copilot" : actor?.name}</strong> {a.text}
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
