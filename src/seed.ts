import { AppState, Deal, DEFAULT_STAGES, Member } from "./types";

/** Dates are generated relative to "now" so the demo always looks alive. */
const now = new Date();
const day = (offset: number) => {
  const d = new Date(now.getTime() + offset * 24 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};
const dt = (offsetDays: number, hour = 10) => {
  const d = new Date(now.getTime() + offsetDays * 24 * 3600 * 1000);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const MEMBERS: Member[] = [
  { id: "m1", name: "Rohan Mehta", initials: "RM", role: "MD", color: "#7c5cff" },
  { id: "m2", name: "Neha Kapoor", initials: "NK", role: "Director", color: "#2f9e8f" },
  { id: "m3", name: "Vikram Shah", initials: "VS", role: "VP", color: "#d97706" },
  { id: "m4", name: "Ananya Rao", initials: "AR", role: "Associate", color: "#3b82f6" },
  { id: "m5", name: "Karan Patel", initials: "KP", role: "Analyst", color: "#db2777" },
  { id: "m6", name: "Priya Nair", initials: "PN", role: "Legal", color: "#64748b" },
];

const deals: Deal[] = [
  {
    id: "d1",
    name: "Project Horizon",
    codename: "HORIZON",
    client: "Meridian Renewables Pvt Ltd",
    type: "Sell-side M&A",
    valueM: 420,
    stageId: "modeling",
    leadId: "m1",
    teamIds: ["m1", "m3", "m4", "m5"],
    targetClose: day(75),
    createdAt: dt(-42),
    summary:
      "Sale of a 300 MW solar + wind portfolio. Three strategic buyers and two infra funds in the process. Sensitive on PPA repricing risk.",
    tasks: [
      { id: "t1", title: "Populate data room index", stageId: "data_room", assigneeId: "m5", dueDate: day(-10), status: "done", blocking: true, requiresApproval: false },
      { id: "t2", title: "Normalize 3-yr historical financials", stageId: "modeling", assigneeId: "m5", dueDate: day(-2), status: "in_progress", blocking: true, requiresApproval: true },
      { id: "t3", title: "Build DCF with PPA sensitivity cases", stageId: "modeling", assigneeId: "m4", dueDate: day(3), status: "in_progress", blocking: true, requiresApproval: true },
      { id: "t4", title: "Comparable transactions screen", stageId: "modeling", assigneeId: "m5", dueDate: day(1), status: "done", blocking: false, requiresApproval: true },
      { id: "t19", title: "Refresh trading comps with latest quarter", stageId: "modeling", assigneeId: "m5", dueDate: day(2), status: "todo", blocking: false, requiresApproval: false },
      { id: "t20", title: "Assemble football-field valuation exhibit", stageId: "modeling", assigneeId: "m4", dueDate: day(3), status: "todo", blocking: false, requiresApproval: false },
      { id: "t5", title: "Draft valuation summary memo", stageId: "internal_review", assigneeId: "m4", dueDate: day(7), status: "todo", blocking: true, requiresApproval: true },
    ],
    docs: [
      {
        id: "doc1",
        name: "Horizon — Operating Model v3",
        type: "Model",
        ownerId: "m4",
        status: "in_review",
        dependsOn: ["doc3"],
        versions: [
          { v: 1, date: dt(-14), authorId: "m5", note: "Initial build from data room extracts" },
          { v: 2, date: dt(-6), authorId: "m4", note: "Added PPA repricing scenarios" },
          { v: 3, date: dt(-1, 18), authorId: "m4", note: "VP comments incorporated; capex phasing fixed" },
        ],
      },
      {
        id: "doc2",
        name: "Horizon — Teaser & CIM outline",
        type: "Pitch Book",
        ownerId: "m4",
        status: "draft",
        dependsOn: ["doc1"],
        versions: [{ v: 1, date: dt(-8), authorId: "m4", note: "First draft for MD review" }],
      },
      {
        id: "doc3",
        name: "Data room extract — audited financials FY23-25",
        type: "Data",
        ownerId: "m5",
        status: "approved",
        dependsOn: [],
        versions: [
          { v: 1, date: dt(-16), authorId: "m5", note: "Initial upload" },
          { v: 2, date: dt(-3), authorId: "m5", note: "Client re-sent FY25 with restated depreciation" },
        ],
      },
      {
        id: "doc4",
        name: "Engagement letter (executed)",
        type: "Legal",
        ownerId: "m6",
        status: "approved",
        dependsOn: [],
        versions: [{ v: 1, date: dt(-40), authorId: "m6", note: "Signed by client" }],
      },
    ],
    comments: [
      { id: "c1", authorId: "m3", text: "WACC of 9.8% feels light given PPA rollover risk — run 10.5-11% band as base case.", createdAt: dt(-5), resolved: false, target: "Operating Model v3" },
      { id: "c2", authorId: "m1", text: "Teaser should lead with the wind assets — better story for strategics.", createdAt: dt(-4), resolved: false, target: "Teaser & CIM outline" },
      { id: "c3", authorId: "m4", text: "FY25 depreciation restated in latest client upload — model updated.", createdAt: dt(-2), resolved: true, target: "Data room extract" },
    ],
    activity: [
      { id: "a1", ts: dt(-42), actorId: "m1", text: "created the deal and assigned the core team" },
      { id: "a2", ts: dt(-16), actorId: "m5", text: "uploaded audited financials to the data room" },
      { id: "a3", ts: dt(-8), actorId: "m4", text: "drafted the teaser & CIM outline" },
      { id: "a4", ts: dt(-6), actorId: "m4", text: "published Operating Model v2 with PPA scenarios" },
      { id: "a5", ts: dt(-3), actorId: "m5", text: "re-uploaded FY25 financials (restated depreciation)" },
      { id: "a6", ts: dt(-1, 18), actorId: "m4", text: "published Operating Model v3" },
    ],
  },
  {
    id: "d2",
    name: "Project Atlas",
    codename: "ATLAS",
    client: "Kestrel Consumer Brands",
    type: "Buy-side M&A",
    valueM: 180,
    stageId: "data_room",
    leadId: "m2",
    teamIds: ["m2", "m3", "m5"],
    targetClose: day(110),
    createdAt: dt(-20),
    summary:
      "Acquisition of a regional snacks brand. Diligence focused on channel concentration and co-packer contracts.",
    tasks: [
      { id: "t6", title: "Issue diligence request list", stageId: "data_room", assigneeId: "m3", dueDate: day(-6), status: "done", blocking: true, requiresApproval: false },
      { id: "t7", title: "Review co-packer agreements", stageId: "data_room", assigneeId: "m6", dueDate: day(2), status: "in_progress", blocking: true, requiresApproval: false },
      { id: "t8", title: "Extract monthly P&L by channel", stageId: "data_room", assigneeId: "m5", dueDate: day(-1), status: "in_progress", blocking: true, requiresApproval: true },
      { id: "t9", title: "Preliminary synergy hypothesis", stageId: "modeling", assigneeId: "m3", dueDate: day(9), status: "todo", blocking: false, requiresApproval: false },
      { id: "t21", title: "Tag data room documents by workstream", stageId: "data_room", assigneeId: "m5", dueDate: day(1), status: "todo", blocking: false, requiresApproval: false },
      { id: "t22", title: "Summarize management call notes", stageId: "data_room", assigneeId: "m3", dueDate: day(3), status: "todo", blocking: false, requiresApproval: false },
    ],
    docs: [
      {
        id: "doc5",
        name: "Atlas — Diligence tracker",
        type: "Diligence",
        ownerId: "m3",
        status: "in_review",
        dependsOn: [],
        versions: [
          { v: 1, date: dt(-12), authorId: "m3", note: "Initial request list sent" },
          { v: 2, date: dt(-4), authorId: "m5", note: "60% of items received" },
        ],
      },
      {
        id: "doc6",
        name: "NDA (executed)",
        type: "Legal",
        ownerId: "m6",
        status: "approved",
        dependsOn: [],
        versions: [{ v: 1, date: dt(-18), authorId: "m6", note: "Countersigned" }],
      },
    ],
    comments: [
      { id: "c4", authorId: "m2", text: "Top-2 retail chains are 55% of revenue — need churn history before we model growth.", createdAt: dt(-6), resolved: false, target: "Diligence tracker" },
    ],
    activity: [
      { id: "a7", ts: dt(-20), actorId: "m2", text: "created the deal" },
      { id: "a8", ts: dt(-18), actorId: "m6", text: "uploaded executed NDA" },
      { id: "a9", ts: dt(-12), actorId: "m3", text: "issued diligence request list" },
      { id: "a10", ts: dt(-4), actorId: "m5", text: "updated diligence tracker — 60% items received" },
    ],
  },
  {
    id: "d3",
    name: "Project Beacon",
    codename: "BEACON",
    client: "Northgate Health Group",
    type: "Capital Raise",
    valueM: 95,
    stageId: "internal_review",
    leadId: "m1",
    teamIds: ["m1", "m2", "m4"],
    targetClose: day(40),
    createdAt: dt(-60),
    summary:
      "Series D primary raise for a hospital chain. Investor deck in internal review ahead of first outreach wave.",
    tasks: [
      { id: "t10", title: "Finalize fundraising model", stageId: "modeling", assigneeId: "m4", dueDate: day(-8), status: "done", blocking: true, requiresApproval: true, approvedById: "m2" },
      { id: "t11", title: "MD review of investor deck", stageId: "internal_review", assigneeId: "m1", dueDate: day(-1), status: "in_progress", blocking: true, requiresApproval: false },
      { id: "t12", title: "Build investor target list (40 names)", stageId: "internal_review", assigneeId: "m4", dueDate: day(4), status: "done", blocking: false, requiresApproval: true },
      { id: "t23", title: "Compile IC pre-read pack", stageId: "internal_review", assigneeId: "m4", dueDate: day(2), status: "todo", blocking: false, requiresApproval: false },
    ],
    docs: [
      {
        id: "doc7",
        name: "Beacon — Fundraising model",
        type: "Model",
        ownerId: "m4",
        status: "approved",
        dependsOn: [],
        versions: [
          { v: 1, date: dt(-25), authorId: "m4", note: "Initial build" },
          { v: 2, date: dt(-9), authorId: "m4", note: "Director comments; bed-capacity ramp revised" },
          { v: 3, date: dt(-2, 20), authorId: "m4", note: "Updated with Q2 actuals" },
        ],
      },
      {
        id: "doc8",
        name: "Beacon — Investor deck",
        type: "Pitch Book",
        ownerId: "m4",
        status: "in_review",
        dependsOn: ["doc7"],
        versions: [
          { v: 1, date: dt(-15), authorId: "m4", note: "First full draft" },
          { v: 2, date: dt(-6), authorId: "m4", note: "Narrative restructure per Director" },
        ],
      },
    ],
    comments: [
      { id: "c5", authorId: "m1", text: "Unit economics slide: show contribution margin per bed, not per facility.", createdAt: dt(-5), resolved: false, target: "Investor deck" },
      { id: "c6", authorId: "m2", text: "Q2 actuals now in model v3 — deck figures on slides 8-11 need a refresh.", createdAt: dt(-2), resolved: false, target: "Investor deck" },
    ],
    activity: [
      { id: "a11", ts: dt(-60), actorId: "m1", text: "created the deal" },
      { id: "a12", ts: dt(-9), actorId: "m4", text: "published Fundraising model v2" },
      { id: "a13", ts: dt(-6), actorId: "m4", text: "published Investor deck v2" },
      { id: "a14", ts: dt(-2, 20), actorId: "m4", text: "published Fundraising model v3 with Q2 actuals" },
    ],
  },
  {
    id: "d4",
    name: "Project Granite",
    codename: "GRANITE",
    client: "Stonebridge Logistics",
    type: "Sell-side M&A",
    valueM: 640,
    stageId: "negotiation",
    leadId: "m2",
    teamIds: ["m2", "m3", "m5", "m6"],
    targetClose: day(21),
    createdAt: dt(-140),
    summary:
      "Two final bidders. SPA mark-ups exchanged; open points on indemnity cap and working-capital peg.",
    tasks: [
      { id: "t13", title: "Respond to bidder A SPA mark-up", stageId: "negotiation", assigneeId: "m6", dueDate: day(2), status: "in_progress", blocking: true, requiresApproval: false },
      { id: "t14", title: "Working capital peg analysis", stageId: "negotiation", assigneeId: "m5", dueDate: day(-3), status: "done", blocking: true, requiresApproval: true, approvedById: "m3" },
      { id: "t15", title: "Closing checklist & CP tracker", stageId: "closing", assigneeId: "m6", dueDate: day(10), status: "todo", blocking: true, requiresApproval: false },
      { id: "t24", title: "Prepare issues list for next negotiation session", stageId: "negotiation", assigneeId: "m5", dueDate: day(1), status: "todo", blocking: false, requiresApproval: false },
      { id: "t25", title: "Update deal timeline for client update call", stageId: "negotiation", assigneeId: "m3", dueDate: day(2), status: "todo", blocking: false, requiresApproval: false },
    ],
    docs: [
      {
        id: "doc9",
        name: "Granite — SPA (bidder A mark-up r2)",
        type: "Legal",
        ownerId: "m6",
        status: "in_review",
        dependsOn: [],
        versions: [
          { v: 1, date: dt(-20), authorId: "m6", note: "First draft to bidders" },
          { v: 2, date: dt(-7), authorId: "m6", note: "Bidder A mark-up round 1" },
          { v: 3, date: dt(-1, 15), authorId: "m6", note: "Bidder A mark-up round 2" },
        ],
      },
      {
        id: "doc10",
        name: "Granite — WC peg analysis",
        type: "Memo",
        ownerId: "m5",
        status: "approved",
        dependsOn: [],
        versions: [
          { v: 1, date: dt(-10), authorId: "m5", note: "12-month average method" },
          { v: 2, date: dt(-4), authorId: "m5", note: "Seasonality-adjusted; VP approved" },
        ],
      },
    ],
    comments: [
      { id: "c7", authorId: "m2", text: "Indemnity cap: hold at 15% — walk-away point is 20%. Do not concede early.", createdAt: dt(-3), resolved: false, target: "SPA mark-up r2" },
    ],
    activity: [
      { id: "a15", ts: dt(-140), actorId: "m2", text: "created the deal" },
      { id: "a16", ts: dt(-20), actorId: "m6", text: "circulated first SPA draft" },
      { id: "a17", ts: dt(-4), actorId: "m5", text: "published seasonality-adjusted WC peg (approved)" },
      { id: "a18", ts: dt(-1, 15), actorId: "m6", text: "logged bidder A SPA mark-up round 2" },
    ],
  },
  {
    id: "d5",
    name: "Project Juniper",
    codename: "JUNIPER",
    client: "Juniper Foods (fictional)",
    type: "Sell-side M&A",
    valueM: 75,
    stageId: "nda",
    leadId: "m3",
    teamIds: ["m3", "m5", "m6"],
    targetClose: day(160),
    createdAt: dt(-6),
    summary: "Founder-owned QSR chain exploring a sale. Engagement letter under negotiation.",
    tasks: [
      { id: "t16", title: "Negotiate engagement letter terms", stageId: "nda", assigneeId: "m6", dueDate: day(4), status: "in_progress", blocking: true, requiresApproval: false },
      { id: "t17", title: "Draft NDA template for buyer outreach", stageId: "nda", assigneeId: "m6", dueDate: day(6), status: "todo", blocking: true, requiresApproval: false },
      { id: "t18", title: "Kick-off call with founder", stageId: "mandate", assigneeId: "m3", dueDate: day(-4), status: "done", blocking: true, requiresApproval: false },
      { id: "t26", title: "Compile preliminary buyer long-list", stageId: "nda", assigneeId: "m5", dueDate: day(5), status: "todo", blocking: false, requiresApproval: false },
    ],
    docs: [
      {
        id: "doc11",
        name: "Juniper — Engagement letter (draft)",
        type: "Legal",
        ownerId: "m6",
        status: "draft",
        dependsOn: [],
        versions: [{ v: 1, date: dt(-3), authorId: "m6", note: "Standard sell-side terms, 1.25% success fee" }],
      },
    ],
    comments: [],
    activity: [
      { id: "a19", ts: dt(-6), actorId: "m3", text: "created the deal" },
      { id: "a20", ts: dt(-3), actorId: "m6", text: "drafted engagement letter" },
    ],
  },
];

export const SEED: AppState = {
  deals,
  members: MEMBERS,
  currentUserId: "m4",
  stages: DEFAULT_STAGES.map((s) => ({ ...s })),
};
