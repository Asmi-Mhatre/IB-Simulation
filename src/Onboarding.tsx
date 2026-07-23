import React, { useState } from "react";
import { Role } from "./types";

const ROLES: Role[] = ["MD", "Director", "VP", "Associate", "Analyst", "Legal"];

/* ---------- Identity setup (for a fresh, personal workspace) ---------- */

export function IdentitySetup({
  onCreate,
  onCancel,
}: {
  onCreate: (name: string, role: Role) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Associate");
  const submit = () => name.trim() && onCreate(name.trim(), role);
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal identity-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Set up your workspace</h2>
        <p className="subtle">
          Deloquer runs entirely in your browser — there's no account to create. Just tell us who
          <strong> you</strong> are. You'll be the first member of your team, and you can add the
          rest (and assign them to deals) from the Team page.
        </p>
        <label className="field-label">Your name</label>
        <input
          autoFocus
          value={name}
          placeholder="e.g. Asmi Mhatre"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <label className="field-label">Your role</label>
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <div className="modal-actions">
          <button className="btn" onClick={onCancel}>
            Back
          </button>
          <button className="btn btn-primary" disabled={!name.trim()} onClick={submit}>
            Create my workspace →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- First-visit welcome hero ---------- */

export function Welcome({
  onStartTour,
  onSkip,
  onStartBlank,
}: {
  onStartTour: () => void;
  onSkip: () => void;
  onStartBlank: () => void;
}) {
  return (
    <div className="welcome-overlay">
      <div className="w-orb w-orb-1" />
      <div className="w-orb w-orb-2" />
      <div className="w-orb w-orb-3" />

      <div className="w-float w-float-1">
        <span className="health-dot health-green" style={{ width: 8, height: 8 }} /> HORIZON — on track
      </div>
      <div className="w-float w-float-2">⚠ Pitch book stale — model updated after v1</div>
      <div className="w-float w-float-3">Advance to Closing →</div>
      <div className="w-float w-float-4">✓ Approved by Neha</div>
      <div className="w-float w-float-5">🔒 Stage gate: 2 tasks blocking</div>
      <div className="w-float w-float-6">
        <span className="health-dot health-red" style={{ width: 8, height: 8 }} /> ATLAS — at risk
      </div>
      <div className="w-float w-float-7">🔓 Gate overridden — reason logged</div>
      <div className="w-float w-float-8">📄 Operating Model v3 · signed off</div>

      <div className="welcome-content">
        <div className="w-logo w-anim" style={{ animationDelay: "0.05s" }}>
          <span className="logo-mark">◆</span> Deloquer
        </div>
        <div className="w-pill w-anim" style={{ animationDelay: "0.15s" }}>
          <span className="w-pill-dot" /> Deal Execution OS
        </div>
        <h1 className="w-headline w-anim" style={{ animationDelay: "0.25s" }}>
          Run every deal
          <br />
          <span className="w-accent">like clockwork.</span>
        </h1>
        <p className="w-sub w-anim" style={{ animationDelay: "0.4s" }}>
          Pipeline, stage-gated checklists, approvals, versioned documents and automated review —
          one workspace for the whole transaction, from mandate to closing.
        </p>
        <div className="w-ctas w-anim" style={{ animationDelay: "0.55s" }}>
          <button className="w-btn-primary" onClick={onStartTour}>
            Take the 60-second tour →
          </button>
          <button className="w-btn-ghost" onClick={onSkip}>
            Explore with sample deals
          </button>
        </div>
        <button className="w-btn-text w-anim" style={{ animationDelay: "0.62s" }} onClick={onStartBlank}>
          or start with an empty workspace →
        </button>
        <p className="w-hint w-anim" style={{ animationDelay: "0.7s" }}>
          Sample deals let you look around · start empty to run your own · everything stays in your
          browser
        </p>
      </div>
    </div>
  );
}

/* ---------- Guided tour ---------- */

export interface TourStep {
  title: string;
  body: string;
  /** Navigate the app to the screen this step talks about. */
  go?: () => void;
}

export function Tour({
  steps,
  step,
  onStep,
  onClose,
}: {
  steps: TourStep[];
  step: number;
  onStep: (i: number) => void;
  onClose: () => void;
}) {
  const s = steps[step];
  const last = step === steps.length - 1;
  return (
    <div className="tour-card" role="dialog" aria-label="Product tour">
      <div className="tour-step-label">
        Step {step + 1} of {steps.length}
      </div>
      <h3 className="tour-title">{s.title}</h3>
      <p className="tour-body">{s.body}</p>
      <div className="tour-dots">
        {steps.map((_, i) => (
          <button
            key={i}
            className={`tour-dot ${i === step ? "on" : i < step ? "seen" : ""}`}
            onClick={() => onStep(i)}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>
      <div className="tour-actions">
        <button className="btn-link tour-skip" onClick={onClose}>
          Skip tour
        </button>
        <div className="tour-nav">
          {step > 0 && (
            <button className="btn" onClick={() => onStep(step - 1)}>
              Back
            </button>
          )}
          <button className="btn btn-primary" onClick={() => (last ? onClose() : onStep(step + 1))}>
            {last ? "Finish" : "Next →"}
          </button>
        </div>
      </div>
    </div>
  );
}
