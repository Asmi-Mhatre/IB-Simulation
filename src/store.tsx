import React, { createContext, useContext, useEffect, useReducer } from "react";
import {
  AppState,
  Deal,
  DealType,
  Doc,
  DocType,
  GateOverride,
  Member,
  Role,
  StageId,
  STAGES,
  stageIndex,
  Task,
  TaskStatus,
} from "./types";
import { SEED } from "./seed";
import { ROLE_FALLBACK, STAGE_OFFSETS, TEMPLATES } from "./templates";

const STORAGE_KEY = "dealos-state-v1";

/**
 * An empty workspace: no deals, but the team roster is kept so new deals have
 * people to assign. This is what a real team starts from instead of the demo.
 */
export const EMPTY: AppState = {
  deals: [],
  members: SEED.members,
  currentUserId: SEED.currentUserId,
};

export const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();

const MEMBER_COLORS = [
  "#7c5cff", "#2f9e8f", "#d97706", "#3b82f6", "#db2777",
  "#64748b", "#0ea5e9", "#e11d48", "#16a34a", "#9333ea",
];
/** Two-letter initials from a name, e.g. "Neha Kapoor" -> "NK". */
export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
/** True if a member is referenced anywhere and therefore can't be safely removed. */
export function memberInUse(state: AppState, memberId: string): boolean {
  return state.deals.some(
    (d) =>
      d.leadId === memberId ||
      d.teamIds.includes(memberId) ||
      d.tasks.some((t) => t.assigneeId === memberId || t.approvedById === memberId)
  );
}

type Action =
  | { type: "reset" }
  | { type: "startBlank" }
  | { type: "advanceStage"; dealId: string }
  | { type: "overrideStage"; dealId: string; reason: string }
  | { type: "createDeal"; deal: Deal }
  | { type: "applyTemplate"; dealId: string }
  | { type: "addTask"; dealId: string; title: string; assigneeId: string; dueDate: string; blocking: boolean; requiresApproval: boolean }
  | { type: "setTaskStatus"; dealId: string; taskId: string; status: TaskStatus }
  | { type: "approveTask"; dealId: string; taskId: string }
  | { type: "revokeApproval"; dealId: string; taskId: string }
  | { type: "addDoc"; dealId: string; name: string; docType: DocType; note: string; dependsOn: string[] }
  | { type: "addDocVersion"; dealId: string; docId: string; note: string }
  | { type: "setDocStatus"; dealId: string; docId: string; status: Doc["status"] }
  | { type: "addComment"; dealId: string; text: string; target: string }
  | { type: "toggleComment"; dealId: string; commentId: string }
  | { type: "addMember"; name: string; role: Role }
  | { type: "updateMember"; memberId: string; name: string; role: Role }
  | { type: "removeMember"; memberId: string }
  | { type: "setCurrentUser"; memberId: string };

function log(deal: Deal, actorId: string, text: string): Deal {
  return {
    ...deal,
    activity: [...deal.activity, { id: uid(), ts: nowIso(), actorId, text }],
  };
}

function updateDeal(state: AppState, dealId: string, fn: (d: Deal) => Deal): AppState {
  return { ...state, deals: state.deals.map((d) => (d.id === dealId ? fn(d) : d)) };
}

function reducer(state: AppState, action: Action): AppState {
  const me = state.currentUserId;
  switch (action.type) {
    case "reset":
      return SEED;

    case "startBlank":
      return EMPTY;

    case "createDeal":
      return { ...state, deals: [action.deal, ...state.deals] };

    case "advanceStage":
      return updateDeal(state, action.dealId, (d) => {
        const idx = stageIndex(d.stageId);
        if (idx >= STAGES.length - 1) return d;
        const blocked = d.tasks.some(
          (t) => t.stageId === d.stageId && t.blocking && t.status !== "done"
        );
        if (blocked) return d;
        const next = STAGES[idx + 1].id as StageId;
        return log({ ...d, stageId: next }, me, `advanced the deal to ${STAGES[idx + 1].label}`);
      });

    case "overrideStage":
      return updateDeal(state, action.dealId, (d) => {
        const idx = stageIndex(d.stageId);
        if (idx >= STAGES.length - 1) return d;
        const reason = action.reason.trim();
        if (!reason) return d; // a reason is mandatory — no silent overrides
        const skipped = d.tasks.filter(
          (t) => t.stageId === d.stageId && t.blocking && t.status !== "done"
        );
        if (skipped.length === 0) return d; // nothing to break glass over
        const actor = state.members.find((m) => m.id === me);
        const from = d.stageId;
        const to = STAGES[idx + 1].id as StageId;
        const override: GateOverride = {
          id: uid(),
          ts: nowIso(),
          actorId: me,
          actorRole: actor?.role ?? "Analyst",
          fromStage: from,
          toStage: to,
          reason,
          skippedTaskIds: skipped.map((t) => t.id),
          skippedTaskTitles: skipped.map((t) => t.title),
        };
        const advanced: Deal = {
          ...d,
          stageId: to,
          overrides: [...(d.overrides ?? []), override],
          activity: [
            ...d.activity,
            {
              id: uid(),
              ts: nowIso(),
              actorId: me,
              kind: "override",
              text: `broke glass to advance to ${STAGES[idx + 1].label}, skipping ${skipped.length} gate task${
                skipped.length > 1 ? "s" : ""
              } — "${reason}"`,
            },
          ],
        };
        return advanced;
      });

    case "applyTemplate":
      return updateDeal(state, action.dealId, (d) => {
        const template = TEMPLATES[d.type];
        const team = state.members.filter((m) => d.teamIds.includes(m.id));
        const created = new Date(d.createdAt).getTime();
        const tasks: Task[] = template.map((t) => {
          const assignee =
            ROLE_FALLBACK[t.role].map((r) => team.find((m) => m.role === r)).find(Boolean) ??
            state.members.find((m) => m.id === d.leadId)!;
          const due = new Date(created + STAGE_OFFSETS[t.stageId] * 86400000);
          return {
            id: uid(),
            title: t.title,
            stageId: t.stageId,
            assigneeId: assignee.id,
            dueDate: due.toISOString().slice(0, 10),
            status: "todo" as TaskStatus,
            blocking: t.blocking,
            requiresApproval: t.requiresApproval,
          };
        });
        return log(
          { ...d, tasks: [...d.tasks, ...tasks] },
          me,
          `applied the ${d.type} playbook (${tasks.length} tasks)`
        );
      });

    case "addTask":
      return updateDeal(state, action.dealId, (d) => {
        const t: Task = {
          id: uid(),
          title: action.title,
          stageId: d.stageId,
          assigneeId: action.assigneeId,
          dueDate: action.dueDate,
          status: "todo",
          blocking: action.blocking,
          requiresApproval: action.requiresApproval,
        };
        return log({ ...d, tasks: [...d.tasks, t] }, me, `added task "${action.title}"`);
      });

    case "setTaskStatus":
      return updateDeal(state, action.dealId, (d) => {
        const t = d.tasks.find((x) => x.id === action.taskId);
        if (!t) return d;
        const tasks = d.tasks.map((x) =>
          x.id === action.taskId ? { ...x, status: action.status } : x
        );
        return log({ ...d, tasks }, me, `marked "${t.title}" as ${action.status.replace("_", " ")}`);
      });

    case "approveTask":
      return updateDeal(state, action.dealId, (d) => {
        const t = d.tasks.find((x) => x.id === action.taskId);
        if (!t) return d;
        // Separation of duties: you cannot approve your own work, and an
        // existing sign-off can't be silently overwritten by someone else.
        if (t.assigneeId === me) return d;
        if (t.approvedById) return d;
        const tasks = d.tasks.map((x) =>
          x.id === action.taskId ? { ...x, approvedById: me } : x
        );
        return log({ ...d, tasks }, me, `approved "${t.title}"`);
      });

    case "revokeApproval":
      return updateDeal(state, action.dealId, (d) => {
        const t = d.tasks.find((x) => x.id === action.taskId);
        if (!t || !t.approvedById) return d;
        // Only the person who signed off can withdraw their own sign-off —
        // one person cannot change another's approval.
        if (t.approvedById !== me) return d;
        const tasks = d.tasks.map((x) =>
          x.id === action.taskId ? { ...x, approvedById: undefined } : x
        );
        return log({ ...d, tasks }, me, `withdrew sign-off on "${t.title}"`);
      });

    case "addDoc":
      return updateDeal(state, action.dealId, (d) => {
        const doc: Doc = {
          id: uid(),
          name: action.name,
          type: action.docType,
          ownerId: me,
          status: "draft",
          dependsOn: action.dependsOn,
          versions: [{ v: 1, date: nowIso(), authorId: me, note: action.note || "Initial version" }],
        };
        return log({ ...d, docs: [...d.docs, doc] }, me, `added document "${action.name}"`);
      });

    case "addDocVersion":
      return updateDeal(state, action.dealId, (d) => {
        const doc = d.docs.find((x) => x.id === action.docId);
        if (!doc) return d;
        const v = Math.max(...doc.versions.map((x) => x.v)) + 1;
        const docs = d.docs.map((x) =>
          x.id === action.docId
            ? { ...x, versions: [...x.versions, { v, date: nowIso(), authorId: me, note: action.note }] }
            : x
        );
        return log({ ...d, docs }, me, `published ${doc.name} v${v}`);
      });

    case "setDocStatus":
      return updateDeal(state, action.dealId, (d) => {
        const doc = d.docs.find((x) => x.id === action.docId);
        if (!doc) return d;
        const docs = d.docs.map((x) => (x.id === action.docId ? { ...x, status: action.status } : x));
        return log({ ...d, docs }, me, `set "${doc.name}" to ${action.status.replace("_", " ")}`);
      });

    case "addComment":
      return updateDeal(state, action.dealId, (d) =>
        log(
          {
            ...d,
            comments: [
              ...d.comments,
              { id: uid(), authorId: me, text: action.text, createdAt: nowIso(), resolved: false, target: action.target },
            ],
          },
          me,
          `commented on ${action.target}`
        )
      );

    case "toggleComment":
      return updateDeal(state, action.dealId, (d) => ({
        ...d,
        comments: d.comments.map((c) =>
          c.id === action.commentId ? { ...c, resolved: !c.resolved } : c
        ),
      }));

    case "addMember": {
      const name = action.name.trim();
      if (!name) return state;
      const member: Member = {
        id: uid(),
        name,
        initials: initialsFrom(name),
        role: action.role,
        color: MEMBER_COLORS[state.members.length % MEMBER_COLORS.length],
      };
      return { ...state, members: [...state.members, member] };
    }

    case "updateMember": {
      const name = action.name.trim();
      if (!name) return state;
      return {
        ...state,
        members: state.members.map((m) =>
          m.id === action.memberId
            ? { ...m, name, initials: initialsFrom(name), role: action.role }
            : m
        ),
      };
    }

    case "removeMember": {
      // Guard: don't remove someone still referenced by a deal or task.
      if (memberInUse(state, action.memberId)) return state;
      if (state.members.length <= 1) return state; // keep at least one person
      const members = state.members.filter((m) => m.id !== action.memberId);
      const currentUserId =
        state.currentUserId === action.memberId ? members[0].id : state.currentUserId;
      return { ...state, members, currentUserId };
    }

    case "setCurrentUser":
      return state.members.some((m) => m.id === action.memberId)
        ? { ...state, currentUserId: action.memberId }
        : state;

    default:
      return state;
  }
}

export function makeDeal(input: {
  name: string;
  client: string;
  type: DealType;
  valueM: number;
  leadId: string;
  teamIds: string[];
  targetClose: string;
  summary: string;
}): Deal {
  return {
    id: uid(),
    codename: input.name.replace(/^Project\s+/i, "").toUpperCase().slice(0, 10) || "NEWDEAL",
    stageId: "mandate",
    createdAt: nowIso(),
    tasks: [],
    docs: [],
    comments: [],
    overrides: [],
    activity: [{ id: uid(), ts: nowIso(), actorId: input.leadId, text: "created the deal" }],
    ...input,
  };
}

function loadInitial(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
  } catch {
    /* corrupted state — fall back to seed */
  }
  return SEED;
}

const StoreCtx = createContext<{ state: AppState; dispatch: React.Dispatch<Action> } | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadInitial);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);
  return <StoreCtx.Provider value={{ state, dispatch }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore outside provider");
  return ctx;
}
