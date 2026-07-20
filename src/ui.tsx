import React from "react";
import { Insight, Member } from "./types";

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

export function InsightCard({ insight }: { insight: Insight }) {
  return (
    <div className={`insight insight-${insight.severity}`}>
      <div className="insight-dot" />
      <div>
        <div className="insight-title">{insight.title}</div>
        <div className="insight-detail">{insight.detail}</div>
      </div>
    </div>
  );
}
