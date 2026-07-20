import React, { useState } from "react";
import { DealType } from "./types";
import { makeDeal, useStore } from "./store";

const DEAL_TYPES: DealType[] = ["Sell-side M&A", "Buy-side M&A", "Capital Raise", "Restructuring"];

export function NewDealModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<DealType>("Sell-side M&A");
  const [valueM, setValueM] = useState(100);
  const [leadId, setLeadId] = useState(state.members[0].id);
  const [teamIds, setTeamIds] = useState<string[]>([state.members[0].id]);
  const [targetClose, setTargetClose] = useState(() =>
    new Date(Date.now() + 120 * 86400000).toISOString().slice(0, 10)
  );
  const [summary, setSummary] = useState("");

  const toggleTeam = (id: string) =>
    setTeamIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>New Deal</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !client.trim()) return;
            const deal = makeDeal({
              name: name.trim(),
              client: client.trim(),
              type,
              valueM,
              leadId,
              teamIds: teamIds.includes(leadId) ? teamIds : [...teamIds, leadId],
              targetClose,
              summary: summary.trim() || "—",
            });
            dispatch({ type: "createDeal", deal });
            onCreated(deal.id);
          }}
        >
          <label>
            Deal name
            <input placeholder="Project Falcon" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </label>
          <label>
            Client
            <input placeholder="Client company name" value={client} onChange={(e) => setClient(e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Type
              <select value={type} onChange={(e) => setType(e.target.value as DealType)}>
                {DEAL_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Value ($m)
              <input
                type="number"
                min={1}
                value={valueM}
                onChange={(e) => setValueM(Number(e.target.value) || 0)}
              />
            </label>
            <label>
              Target close
              <input type="date" value={targetClose} onChange={(e) => setTargetClose(e.target.value)} />
            </label>
          </div>
          <label>
            Deal lead
            <select value={leadId} onChange={(e) => setLeadId(e.target.value)}>
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </label>
          <div className="team-picker">
            <span className="picker-label">Team</span>
            {state.members.map((m) => (
              <label key={m.id} className={`chip ${teamIds.includes(m.id) ? "chip-on" : ""}`}>
                <input
                  type="checkbox"
                  checked={teamIds.includes(m.id)}
                  onChange={() => toggleTeam(m.id)}
                />
                {m.name.split(" ")[0]} · {m.role}
              </label>
            ))}
          </div>
          <label>
            Summary
            <textarea
              rows={2}
              placeholder="One-line situation overview…"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
            />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create deal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
