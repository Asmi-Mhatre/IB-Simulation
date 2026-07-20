import React, { useEffect, useState } from "react";
import { Health, Insight, Member } from "./types";

export function Avatar({ member, size = 26 }: { member: Member; size?: number }) {
  return (
    <span
      className="avatar"
      title={`${member.name} — ${member.role}`}
      style={{ width: size, height: size, fontSize: size * 0.38, background: member.color }}
    >
      {member.initials}
    </span>
  );
}

export function AvatarStack({ members, max = 4 }: { members: Member[]; max?: number }) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((m) => (
        <Avatar key={m.id} member={m} />
      ))}
      {extra > 0 && <span className="avatar avatar-extra">+{extra}</span>}
    </span>
  );
}

export function Badge({ kind, children }: { kind: string; children: React.ReactNode }) {
  return <span className={`badge badge-${kind}`}>{children}</span>;
}

export function fmtMoney(valueM: number): string {
  return valueM >= 1000 ? `$${(valueM / 1000).toFixed(1)}bn` : `$${valueM}m`;
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relDays(isoDate: string): { label: string; overdue: boolean } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate + "T00:00:00");
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return { label: "today", overdue: false };
  if (diff === 1) return { label: "tomorrow", overdue: false };
  if (diff === -1) return { label: "1d overdue", overdue: true };
  if (diff < 0) return { label: `${-diff}d overdue`, overdue: true };
  return { label: `in ${diff}d`, overdue: false };
}

export function InsightCard({ insight, onClick }: { insight: Insight; onClick?: () => void }) {
  return (
    <div
      className={`insight insight-${insight.severity} ${onClick ? "insight-clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      title={onClick ? "Jump to it" : undefined}
    >
      <div className="insight-dot" />
      <div className="insight-body">
        <div className="insight-title">{insight.title}</div>
        <div className="insight-detail">{insight.detail}</div>
      </div>
      {onClick && <span className="insight-go">→</span>}
    </div>
  );
}

export function HealthDot({ health, size = 8 }: { health: Health; size?: number }) {
  const label = { green: "on track", amber: "needs attention", red: "at risk" }[health];
  return (
    <span
      className={`health-dot health-${health}`}
      style={{ width: size, height: size }}
      title={`Deal health: ${label}`}
    />
  );
}

/** Renders comment text with @mentions highlighted when they match a team member's first name. */
export function RichText({ text, members }: { text: string; members: Member[] }) {
  const firstNames = new Set(members.map((m) => m.name.split(" ")[0].toLowerCase()));
  const parts = text.split(/(@[A-Za-z]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith("@") && firstNames.has(p.slice(1).toLowerCase()) ? (
          <span key={i} className="mention">
            {p}
          </span>
        ) : (
          <React.Fragment key={i}>{p}</React.Fragment>
        )
      )}
    </>
  );
}

export function mentionsMe(text: string, me: Member): boolean {
  return new RegExp(`@${me.name.split(" ")[0]}\\b`, "i").test(text);
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: string;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
      {action && <div className="empty-action">{action}</div>}
    </div>
  );
}

/* ---------- Toasts ---------- */

export function toast(msg: string) {
  window.dispatchEvent(new CustomEvent<string>("dealos-toast", { detail: msg }));
}

export function Toaster() {
  const [items, setItems] = useState<{ id: number; msg: string }[]>([]);
  useEffect(() => {
    let n = 0;
    const onToast = (e: Event) => {
      const id = ++n;
      setItems((prev) => [...prev, { id, msg: (e as CustomEvent<string>).detail }]);
      setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 2600);
    };
    window.addEventListener("dealos-toast", onToast);
    return () => window.removeEventListener("dealos-toast", onToast);
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="toaster">
      {items.map((t) => (
        <div key={t.id} className="toast">
          {t.msg}
        </div>
      ))}
    </div>
  );
}
