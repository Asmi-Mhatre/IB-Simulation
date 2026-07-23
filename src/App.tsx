import React, { useCallback, useEffect, useState } from "react";
import { StoreProvider, useStore } from "./store";
import { Pipeline } from "./Pipeline";
import { Workspace } from "./Workspace";
import { NewDealModal } from "./NewDealModal";
import { MyWork } from "./MyWork";
import { CommandPalette, usePaletteCommands } from "./CommandPalette";
import { Tour, TourStep, Welcome } from "./Onboarding";
import { Avatar, HealthDot, Toaster, toast } from "./ui";
import { dealHealth } from "./types";

type View = { kind: "pipeline" } | { kind: "mywork" } | { kind: "deal"; dealId: string; tab?: string };

const THEME_KEY = "dealos-theme";
const ONBOARDED_KEY = "dealos-onboarded";

function Shell() {
  const { state, dispatch } = useStore();
  const [view, setView] = useState<View>({ kind: "pipeline" });
  const [showNewDeal, setShowNewDeal] = useState(false);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light"
  );
  const [showWelcome, setShowWelcome] = useState(() => !localStorage.getItem(ONBOARDED_KEY));
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const openDeal = useCallback((dealId: string, tab?: string) => {
    setView({ kind: "deal", dealId, tab });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setShowPalette((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const me = state.members.find((m) => m.id === state.currentUserId)!;
  const now = new Date();
  const myOverdue = state.deals.reduce(
    (s, d) =>
      s +
      d.tasks.filter(
        (t) =>
          t.assigneeId === me.id &&
          t.status !== "done" &&
          t.dueDate < now.toISOString().slice(0, 10)
      ).length,
    0
  );

  const firstDealId = state.deals[0]?.id;
  const tourSteps: TourStep[] = [
    {
      title: "Welcome to DealOS 👋",
      body: "Every live mandate on one board, moving through the eight stages of a real transaction — mandate to closing. This 60-second tour shows you around.",
      go: () => setView({ kind: "pipeline" }),
    },
    {
      title: "Health at a glance",
      body: "Every deal carries a health dot — green is on track, amber needs attention, red is at risk. It's computed live from overdue work, stale documents and missing approvals. No status meetings required.",
      go: () => setView({ kind: "pipeline" }),
    },
    {
      title: "Inside a deal",
      body: "The stage stepper shows where the deal stands. Tasks marked as gates must be done before the deal can advance — the banner tells you exactly what's blocking. Done and approved are tracked separately, just like real life.",
      go: () => firstDealId && setView({ kind: "deal", dealId: firstDealId, tab: "checklist" }),
    },
    {
      title: "Deal Review — your quiet analyst",
      body: "DealOS continuously checks every deal: stale documents, overdue gates, missing sign-offs, forgotten comments. Click any flag to jump straight to the problem.",
      go: () => firstDealId && setView({ kind: "deal", dealId: firstDealId, tab: "overview" }),
    },
    {
      title: "My Work",
      body: "Everything assigned to you across every deal, sorted by urgency — plus approvals waiting on a click and comments that @mention you. This is your 7am screen.",
      go: () => setView({ kind: "mywork" }),
    },
    {
      title: "You're ready",
      body: "Press Ctrl K to search deals and fly anywhere. Replay this tour anytime from the sidebar. Now go close something.",
      go: () => setView({ kind: "pipeline" }),
    },
  ];

  const finishOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDED_KEY, "1");
  }, []);

  const goToStep = (i: number) => {
    tourSteps[i]?.go?.();
    setTourStep(i);
  };

  const commands = usePaletteCommands({
    openDeal,
    goPipeline: () => setView({ kind: "pipeline" }),
    goMyWork: () => setView({ kind: "mywork" }),
    newDeal: () => setShowNewDeal(true),
    toggleTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
  });

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-mark">◆</span> DealOS
        </div>
        <button className="search-trigger" onClick={() => setShowPalette(true)}>
          <span>Search…</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          <button
            className={`nav-item ${view.kind === "mywork" ? "active" : ""}`}
            onClick={() => setView({ kind: "mywork" })}
          >
            My Work
            {myOverdue > 0 && <span className="nav-badge">{myOverdue}</span>}
          </button>
          <button
            className={`nav-item ${view.kind === "pipeline" ? "active" : ""}`}
            onClick={() => setView({ kind: "pipeline" })}
          >
            Pipeline
          </button>
          <div className="nav-section">Live deals</div>
          {state.deals.map((d) => (
            <button
              key={d.id}
              className={`nav-item nav-deal ${view.kind === "deal" && view.dealId === d.id ? "active" : ""}`}
              onClick={() => openDeal(d.id)}
            >
              <span className="nav-codename">
                <HealthDot health={dealHealth(d, now)} size={7} />
                {d.codename}
              </span>
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
            <button
              className="theme-toggle"
              title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
            >
              {theme === "light" ? "☾" : "☀"}
            </button>
          </div>
          <button className="btn-link subtle" onClick={() => goToStep(0)}>
            Take the tour
          </button>
          <button
            className="btn-link subtle"
            onClick={() => {
              if (confirmReset) {
                dispatch({ type: "reset" });
                setView({ kind: "pipeline" });
                setConfirmReset(false);
                toast("Demo data restored");
              } else {
                setConfirmReset(true);
                setTimeout(() => setConfirmReset(false), 4000);
              }
            }}
          >
            {confirmReset ? "Click again to confirm reset" : "Reset demo data"}
          </button>
          <button
            className="btn-link subtle"
            onClick={() => {
              if (confirmClear) {
                dispatch({ type: "startBlank" });
                setView({ kind: "pipeline" });
                setConfirmClear(false);
                toast("Workspace cleared — start your own deals");
              } else {
                setConfirmClear(true);
                setTimeout(() => setConfirmClear(false), 4000);
              }
            }}
          >
            {confirmClear ? "Click again to clear everything" : "Clear all deals"}
          </button>
        </div>
      </aside>
      <main className="main">
        {view.kind === "deal" ? (
          <Workspace
            key={`${view.dealId}-${view.tab ?? ""}`}
            dealId={view.dealId}
            initialTab={view.tab}
            onBack={() => setView({ kind: "pipeline" })}
          />
        ) : view.kind === "mywork" ? (
          <MyWork onOpen={openDeal} />
        ) : (
          <Pipeline onOpen={openDeal} onNewDeal={() => setShowNewDeal(true)} />
        )}
      </main>
      {showNewDeal && (
        <NewDealModal
          onClose={() => setShowNewDeal(false)}
          onCreated={(id) => {
            setShowNewDeal(false);
            openDeal(id);
          }}
        />
      )}
      {showPalette && <CommandPalette commands={commands} onClose={() => setShowPalette(false)} />}
      {showWelcome && (
        <Welcome
          onStartTour={() => {
            setShowWelcome(false);
            finishOnboarding();
            goToStep(0);
          }}
          onSkip={() => {
            setShowWelcome(false);
            finishOnboarding();
          }}
          onStartBlank={() => {
            dispatch({ type: "startBlank" });
            setView({ kind: "pipeline" });
            setShowWelcome(false);
            finishOnboarding();
            setShowNewDeal(true);
          }}
        />
      )}
      {tourStep !== null && !showWelcome && (
        <Tour
          steps={tourSteps}
          step={tourStep}
          onStep={goToStep}
          onClose={() => {
            setTourStep(null);
            toast("Tour ended — press Ctrl K to explore");
          }}
        />
      )}
      <Toaster />
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
