import React, { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "./store";
import { dealHealth, STAGES, stageIndex } from "./types";
import { HealthDot, fmtMoney } from "./ui";

export interface PaletteCommand {
  id: string;
  label: string;
  hint?: string;
  section: "Deals" | "Go to" | "Actions";
  run: () => void;
  health?: "green" | "amber" | "red";
}

export function CommandPalette({
  commands,
  onClose,
}: {
  commands: PaletteCommand[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter(
      (c) => c.label.toLowerCase().includes(q) || (c.hint ?? "").toLowerCase().includes(q)
    );
  }, [commands, query]);

  useEffect(() => setActive(0), [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(".palette-item.active");
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const sections = ["Deals", "Go to", "Actions"] as const;
  const flat = sections.flatMap((s) => filtered.filter((c) => c.section === s));

  return (
    <div className="modal-overlay palette-overlay" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search deals, jump anywhere, run a command…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown" || e.key === "Down") {
              e.preventDefault();
              setActive((a) => Math.min(a + 1, flat.length - 1));
            }
            if (e.key === "ArrowUp" || e.key === "Up") {
              e.preventDefault();
              setActive((a) => Math.max(a - 1, 0));
            }
            if ((e.key === "Enter" || e.key === "Return") && flat[active]) {
              flat[active].run();
              onClose();
            }
          }}
        />
        <div className="palette-list" ref={listRef}>
          {flat.length === 0 && <div className="palette-empty">No results for “{query}”</div>}
          {sections.map((section) => {
            const items = filtered.filter((c) => c.section === section);
            if (items.length === 0) return null;
            return (
              <div key={section}>
                <div className="palette-section">{section}</div>
                {items.map((c) => {
                  const idx = flat.indexOf(c);
                  return (
                    <button
                      key={c.id}
                      className={`palette-item ${idx === active ? "active" : ""}`}
                      onMouseEnter={() => setActive(idx)}
                      onClick={() => {
                        c.run();
                        onClose();
                      }}
                    >
                      {c.health && <HealthDot health={c.health} />}
                      <span className="palette-label">{c.label}</span>
                      {c.hint && <span className="palette-hint">{c.hint}</span>}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        <div className="palette-footer">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> select</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

/** Builds the standard command list for the palette. */
export function usePaletteCommands(opts: {
  openDeal: (id: string, tab?: string) => void;
  goPipeline: () => void;
  goMyWork: () => void;
  newDeal: () => void;
  toggleTheme: () => void;
}): PaletteCommand[] {
  const { state } = useStore();
  const now = new Date();
  return [
    ...state.deals.map((d) => ({
      id: `deal-${d.id}`,
      label: `${d.name} — ${d.client}`,
      hint: `${fmtMoney(d.valueM)} · ${STAGES[stageIndex(d.stageId)].short}`,
      section: "Deals" as const,
      health: dealHealth(d, now),
      run: () => opts.openDeal(d.id),
    })),
    { id: "go-pipeline", label: "Pipeline", hint: "board of all live deals", section: "Go to", run: opts.goPipeline },
    { id: "go-mywork", label: "My Work", hint: "your tasks across all deals", section: "Go to", run: opts.goMyWork },
    { id: "act-new-deal", label: "New Deal…", hint: "create a mandate", section: "Actions", run: opts.newDeal },
    { id: "act-theme", label: "Toggle dark mode", section: "Actions", run: opts.toggleTheme },
  ];
}
