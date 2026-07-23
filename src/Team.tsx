import React, { useState } from "react";
import { Role } from "./types";
import { memberInUse, useStore } from "./store";
import { Avatar, Badge, toast } from "./ui";

const ROLES: Role[] = ["MD", "Director", "VP", "Associate", "Analyst", "Legal"];

export function Team() {
  const { state, dispatch } = useStore();
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("Associate");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<Role>("Associate");

  const add = () => {
    if (!name.trim()) return;
    dispatch({ type: "addMember", name: name.trim(), role });
    toast(`Added ${name.trim()}`);
    setName("");
    setRole("Associate");
  };

  const startEdit = (id: string, n: string, r: Role) => {
    setEditId(id);
    setEditName(n);
    setEditRole(r);
  };

  return (
    <div className="team-page">
      <div className="page-header">
        <div>
          <h1>Team</h1>
          <p className="subtle">
            The people who work your deals. Add your own, set roles, and choose who you're acting as.
            Roles drive task assignment and who can sign off.
          </p>
        </div>
      </div>

      <div className="team-add panel">
        <input
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <select value={role} onChange={(e) => setRole(e.target.value as Role)}>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" onClick={add} disabled={!name.trim()}>
          + Add member
        </button>
      </div>

      <div className="team-list">
        {state.members.map((m) => {
          const isMe = m.id === state.currentUserId;
          const inUse = memberInUse(state, m.id);
          const editing = editId === m.id;
          return (
            <div key={m.id} className={`team-row panel ${isMe ? "team-row-me" : ""}`}>
              <Avatar member={m} size={34} />
              {editing ? (
                <div className="team-edit">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    autoFocus
                  />
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value as Role)}>
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="team-identity">
                  <div className="team-name">
                    {m.name}
                    {isMe && <span className="team-you">you</span>}
                  </div>
                  <Badge kind="type">{m.role}</Badge>
                </div>
              )}

              <div className="team-actions">
                {editing ? (
                  <>
                    <button
                      className="btn btn-mini btn-primary"
                      disabled={!editName.trim()}
                      onClick={() => {
                        dispatch({
                          type: "updateMember",
                          memberId: m.id,
                          name: editName.trim(),
                          role: editRole,
                        });
                        setEditId(null);
                        toast("Member updated");
                      }}
                    >
                      Save
                    </button>
                    <button className="btn btn-mini" onClick={() => setEditId(null)}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {!isMe && (
                      <button
                        className="btn btn-mini"
                        onClick={() => {
                          dispatch({ type: "setCurrentUser", memberId: m.id });
                          toast(`Now acting as ${m.name}`);
                        }}
                      >
                        Act as
                      </button>
                    )}
                    <button
                      className="btn btn-mini"
                      onClick={() => startEdit(m.id, m.name, m.role)}
                    >
                      Edit
                    </button>
                    <button
                      className="btn btn-mini btn-danger"
                      disabled={inUse || state.members.length <= 1}
                      title={
                        inUse
                          ? "Can't remove — assigned to deals or tasks. Reassign first."
                          : state.members.length <= 1
                            ? "Keep at least one member"
                            : "Remove member"
                      }
                      onClick={() => {
                        dispatch({ type: "removeMember", memberId: m.id });
                        toast(`Removed ${m.name}`);
                      }}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
