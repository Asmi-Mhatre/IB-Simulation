import React, { useState } from "react";
import { StoreProvider, useStore } from "./store";
import { Pipeline } from "./Pipeline";
import { Workspace } from "./Workspace";
import { NewDealModal } from "./NewDealModal";
import { Avatar } from "./ui";
import { computeInsights } from "./types";

function Shell() {
  const { state, dispatch } = useStore();
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const me = state.members.find((m) => m.id === state.currentUserId)!;
  const totalFlags = state.deals.reduce(
    (s, d) => s + computeInsights(d, new Date()).filter((i) => i.severity === "high").length,
    0
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">◆</span> DealOS
        </div>
        <nav>
          <button
            className={`nav-item ${openDealId === null ? "active" : ""}`}
            onClick={() => setOpenDealId(null)}
          >
            Pipeline
            {totalFlags > 0 && <span className="nav-badge">{totalFlags}</span>}
          </button>
          <div className="nav-section">Live deals</div>
          {state.deals.map((d) => (
            <button
              key={d.id}
              className={`nav-item nav-deal ${openDealId === d.id ? "active" : ""}`}
              onClick={() => setOpenDealId(d.id)}
            >
              <span className="nav-codename">{d.codename}</span>
              <span className="nav-client">{d.client}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="me">
            <Avatar member={me} size={30} />
            <div>
              <div className="me-name">{me.name}</div>
              <div className="me-role">{me.role}</div>
            </div>
          </div>
          <button
            className="btn-link subtle"
            onClick={() => {
              if (confirmReset) {
                dispatch({ type: "reset" });
                setOpenDealId(null);
                setConfirmReset(false);
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 4000);
              }
            }}
          >
            {confirmReset ? "Click again to confirm reset" : "Reset demo data"}
          </button>
        </div>
      </aside>
      <main className="main">
        {openDealId ? (
          <Workspace dealId={openDealId} onBack={() => setOpenDealId(null)} />
        ) : (
          <Pipeline onOpen={setOpenDealId} onNewDeal={() => setShowNewDeal(true)} />
        )}
      </main>
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreated={(id) => {
            setShowNewDeal(false);
            setOpenDealId(id);
          }}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
