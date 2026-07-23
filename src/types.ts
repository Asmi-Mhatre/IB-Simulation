/** Stage ids are free-form strings so teams can add their own stages. */
export type StageId = string;

export interface Stage {
  id: StageId;
  label: string;
  short: string;
}

/** The out-of-the-box pipeline. A workspace can customise its own copy. */
export const DEFAULT_STAGES: Stage[] = [
  { id: "mandate", label: "Client Mandate", short: "Mandate" },
  { id: "nda", label: "NDA & Engagement", short: "NDA" },
  { id: "data_room", label: "Data Room & Diligence", short: "Data Room" },
  { id: "modeling", label: "Modeling & Valuation", short: "Modeling" },
  { id: "internal_review", label: "Internal Review", short: "Int. Review" },
  { id: "client_materials", label: "Client Materials", short: "Materials" },
  { id: "negotiation", label: "Negotiation & Signing", short: "Negotiation" },
  { id: "closing", label: "Closing", short: "Closing" },
];

/** Back-compat alias; also the fallback when custom stages aren't supplied. */
export const STAGES = DEFAULT_STAGES;

export const stageIndex = (id: StageId, stages: Stage[] = DEFAULT_STAGES) =>
  stages.findIndex((s) => s.id === id);

export type Role = "MD" | "Director" | "VP" | "Associate" | "Analyst" | "Legal";

export interface Member {
  id: string;
  name: string;
  initials: string;
  role: Role;
  color: string;
}

export type TaskStatus = "todo" | "in_progress" | "done";

export interface Task {
  id: string;
  title: string;
  stageId: StageId;
  assigneeId: string;
  dueDate: string; // ISO date
  status: TaskStatus;
  blocking: boolean; // must be done before the deal can advance past its stage
  requiresApproval: boolean;
  approvedById?: string;
}

export type DocType = "Model" | "Pitch Book" | "Legal" | "Diligence" | "Memo" | "Data";
export type DocStatus = "draft" | "in_review" | "approved";

export interface DocVersion {
  v: number;
  date: string; // ISO datetime
  authorId: string;
  note: string;
  /** Optional uploaded file, stored inline as a base64 data URL (no backend). */
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  dataUrl?: string;
}

export interface Doc {
  id: string;
  name: string;
  type: DocType;
  ownerId: string;
  status: DocStatus;
  /** ids of documents this one depends on — if a dependency is newer, this doc is stale */
  dependsOn: string[];
  versions: DocVersion[];
  /** soft-delete: moved to the recycle bin, restorable until purged */
  deleted?: boolean;
  deletedAt?: string;
  deletedById?: string;
}

/** An uploaded file captured inline (base64 data URL) — no backend storage. */
export interface FileData {
  name: string;
  type: string;
  size: number;
  dataUrl: string;
}

export interface Comment {
  id: string;
  authorId: string;
  text: string;
  createdAt: string; // ISO datetime
  resolved: boolean;
  /** what the comment is attached to, for display */
  target: string;
}

export interface ActivityEvent {
  id: string;
  ts: string; // ISO datetime
  actorId: string;
  text: string;
  /** "override" marks a break-glass event so the feed can render it prominently */
  kind?: "override";
}

/**
 * A "break glass" record: someone advanced a deal past its stage gate while
 * blocking tasks were still open. The reason is mandatory and the skipped tasks
 * are captured by value, so the audit survives even if the tasks are later
 * edited or deleted. This record is the durable audit anchor for the override.
 */
export interface GateOverride {
  id: string;
  ts: string; // ISO datetime
  actorId: string;
  actorRole: Role;
  fromStage: StageId;
  toStage: StageId;
  reason: string;
  skippedTaskIds: string[];
  skippedTaskTitles: string[];
}

export type DealType = "Sell-side M&A" | "Buy-side M&A" | "Capital Raise" | "Restructuring";

export interface Deal {
  id: string;
  name: string;
  codename: string;
  client: string;
  type: DealType;
  valueM: number; // deal value in $ millions
  stageId: StageId;
  leadId: string;
  teamIds: string[];
  targetClose: string; // ISO date
  createdAt: string;
  summary: string;
  tasks: Task[];
  docs: Doc[];
  comments: Comment[];
  activity: ActivityEvent[];
  /** break-glass gate overrides — optional so state persisted before this feature still loads */
  overrides?: GateOverride[];
}

export interface AppState {
  deals: Deal[];
  members: Member[];
  currentUserId: string;
  /** The workspace's pipeline stages — editable by the team. */
  stages: Stage[];
}

/* ---------- Insight engine (rule-based "AI review") ---------- */

export type InsightSeverity = "high" | "medium" | "low";

export interface Insight {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail: string;
}

export function latestVersionDate(doc: Doc): string {
  return doc.versions.reduce((m, v) => (v.date > m ? v.date : m), "");
}

export function computeInsights(deal: Deal, now: Date, stages: Stage[] = DEFAULT_STAGES): Insight[] {
  const insights: Insight[] = [];
  const today = now.toISOString().slice(0, 10);
  const stageLabel = (id: StageId) => stages[stageIndex(id, stages)]?.label ?? id;

  // 1. Overdue tasks
  for (const t of deal.tasks) {
    if (t.status !== "done" && t.dueDate < today) {
      insights.push({
        id: `overdue-${t.id}`,
        severity: t.blocking ? "high" : "medium",
        title: `Overdue: "${t.title}"`,
        detail: `Due ${t.dueDate}${t.blocking ? " — blocks stage advancement" : ""}.`,
      });
    }
  }

  // 2. Blocking tasks incomplete for current stage
  const blockers = deal.tasks.filter(
    (t) => t.stageId === deal.stageId && t.blocking && t.status !== "done"
  );
  if (blockers.length > 0) {
    insights.push({
      id: "stage-blocked",
      severity: "medium",
      title: `${blockers.length} blocking task${blockers.length > 1 ? "s" : ""} open in current stage`,
      detail: `Deal cannot advance past ${stageLabel(deal.stageId)} until: ${blockers
        .map((b) => `"${b.title}"`)
        .join(", ")}.`,
    });
  }

  // 3. Tasks done but awaiting approval
  for (const t of deal.tasks) {
    if (t.status === "done" && t.requiresApproval && !t.approvedById) {
      insights.push({
        id: `approval-${t.id}`,
        severity: "medium",
        title: `Awaiting sign-off: "${t.title}"`,
        detail: "Marked done but no senior approval recorded.",
      });
    }
  }

  // 4. Stale documents (a dependency has a newer version) — deleted docs excluded
  for (const d of deal.docs) {
    if (d.deleted) continue;
    const dDate = latestVersionDate(d);
    for (const depId of d.dependsOn) {
      const dep = deal.docs.find((x) => x.id === depId);
      if (dep && !dep.deleted && latestVersionDate(dep) > dDate) {
        insights.push({
          id: `stale-${d.id}-${depId}`,
          severity: "high",
          title: `"${d.name}" may be stale`,
          detail: `"${dep.name}" was updated after the last version of "${d.name}". Numbers may be inconsistent.`,
        });
      }
    }
  }

  // 5. Unresolved comments older than 3 days
  const staleMs = 3 * 24 * 3600 * 1000;
  const oldUnresolved = deal.comments.filter(
    (c) => !c.resolved && now.getTime() - new Date(c.createdAt).getTime() > staleMs
  );
  if (oldUnresolved.length > 0) {
    insights.push({
      id: "unresolved-comments",
      severity: "low",
      title: `${oldUnresolved.length} comment${oldUnresolved.length > 1 ? "s" : ""} unresolved for 3+ days`,
      detail: oldUnresolved.map((c) => `"${c.text.slice(0, 60)}…" on ${c.target}`).join(" · "),
    });
  }

  // 6. Documents sitting in review
  const inReview = deal.docs.filter((d) => d.status === "in_review" && !d.deleted);
  if (inReview.length > 0) {
    insights.push({
      id: "docs-in-review",
      severity: "low",
      title: `${inReview.length} document${inReview.length > 1 ? "s" : ""} awaiting review`,
      detail: inReview.map((d) => d.name).join(", "),
    });
  }

  // 7. Break-glass overrides whose skipped gate tasks are still not done.
  // The override stays flagged (high severity) until the work it bypassed is
  // actually completed — so a force-advance can't be quietly forgotten.
  for (const o of deal.overrides ?? []) {
    const stillOpen = o.skippedTaskIds.filter((id) => {
      const t = deal.tasks.find((x) => x.id === id);
      // if the task was deleted we can no longer confirm it's done — keep flagging
      return !t || t.status !== "done";
    });
    if (stillOpen.length === 0) continue;
    insights.push({
      id: `override-${o.id}`,
      severity: "high",
      title: `Gate overridden — ${stillOpen.length} skipped task${stillOpen.length > 1 ? "s" : ""} still open`,
      detail: `${o.actorRole} force-advanced ${stageLabel(o.fromStage)} → ${stageLabel(
        o.toStage
      )} past ${o.skippedTaskIds.length} gate task${o.skippedTaskIds.length > 1 ? "s" : ""}. Reason: "${o.reason}". Still open: ${o.skippedTaskTitles
        .filter((_, i) => stillOpen.includes(o.skippedTaskIds[i]))
        .map((t) => `"${t}"`)
        .join(", ")}.`,
    });
  }

  const order = { high: 0, medium: 1, low: 2 } as const;
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}

export type Health = "green" | "amber" | "red";

export function dealHealth(deal: Deal, now: Date, stages: Stage[] = DEFAULT_STAGES): Health {
  const insights = computeInsights(deal, now, stages);
  if (insights.some((i) => i.severity === "high")) return "red";
  if (insights.some((i) => i.severity === "medium")) return "amber";
  return "green";
}

/** Which workspace tab an insight should deep-link to. */
export function insightTab(insightId: string): "checklist" | "documents" | "comments" {
  if (insightId.startsWith("stale-") || insightId === "docs-in-review") return "documents";
  if (insightId === "unresolved-comments") return "comments";
  // override-* deep-links to the checklist so the skipped tasks can be finished
  return "checklist";
}
