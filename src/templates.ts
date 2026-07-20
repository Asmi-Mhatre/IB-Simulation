import { DealType, Role, StageId } from "./types";

export interface TemplateTask {
  title: string;
  stageId: StageId;
  role: Role; // preferred assignee role; falls back down the seniority ladder
  blocking: boolean;
  requiresApproval: boolean;
}

/** Due-date offset (days from deal creation) per stage. */
export const STAGE_OFFSETS: Record<StageId, number> = {
  mandate: 5,
  nda: 12,
  data_room: 25,
  modeling: 40,
  internal_review: 50,
  client_materials: 60,
  negotiation: 85,
  closing: 110,
};

const SELL_SIDE: TemplateTask[] = [
  { title: "Kick-off call & mandate scoping", stageId: "mandate", role: "MD", blocking: true, requiresApproval: false },
  { title: "Execute engagement letter", stageId: "mandate", role: "Legal", blocking: true, requiresApproval: true },
  { title: "Draft NDA template for buyer outreach", stageId: "nda", role: "Legal", blocking: true, requiresApproval: false },
  { title: "Build buyer long-list", stageId: "nda", role: "Analyst", blocking: false, requiresApproval: true },
  { title: "Set up data room index", stageId: "data_room", role: "Analyst", blocking: true, requiresApproval: false },
  { title: "Issue diligence request list", stageId: "data_room", role: "Associate", blocking: false, requiresApproval: false },
  { title: "Normalize historical financials", stageId: "modeling", role: "Analyst", blocking: true, requiresApproval: true },
  { title: "Build operating model & DCF", stageId: "modeling", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Comparable companies & transactions screen", stageId: "modeling", role: "Analyst", blocking: false, requiresApproval: true },
  { title: "Valuation committee review", stageId: "internal_review", role: "VP", blocking: true, requiresApproval: false },
  { title: "Draft teaser & CIM", stageId: "client_materials", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Prepare management presentation", stageId: "client_materials", role: "Associate", blocking: false, requiresApproval: false },
  { title: "Evaluate bids & select shortlist", stageId: "negotiation", role: "VP", blocking: true, requiresApproval: false },
  { title: "Negotiate SPA", stageId: "negotiation", role: "Legal", blocking: true, requiresApproval: false },
  { title: "Closing checklist & CP tracker", stageId: "closing", role: "Legal", blocking: true, requiresApproval: false },
];

const BUY_SIDE: TemplateTask[] = [
  { title: "Kick-off call & acquisition criteria", stageId: "mandate", role: "MD", blocking: true, requiresApproval: false },
  { title: "Execute engagement letter", stageId: "mandate", role: "Legal", blocking: true, requiresApproval: true },
  { title: "Execute NDA with target", stageId: "nda", role: "Legal", blocking: true, requiresApproval: false },
  { title: "Issue diligence request list", stageId: "data_room", role: "Associate", blocking: true, requiresApproval: false },
  { title: "Review data room & maintain Q&A log", stageId: "data_room", role: "Analyst", blocking: true, requiresApproval: false },
  { title: "Build standalone operating model", stageId: "modeling", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Synergy analysis", stageId: "modeling", role: "Associate", blocking: false, requiresApproval: true },
  { title: "Accretion / dilution analysis", stageId: "modeling", role: "Analyst", blocking: false, requiresApproval: true },
  { title: "Draft investment committee memo", stageId: "internal_review", role: "VP", blocking: true, requiresApproval: true },
  { title: "Board presentation", stageId: "client_materials", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Submit indicative offer / LOI", stageId: "negotiation", role: "VP", blocking: true, requiresApproval: false },
  { title: "SPA mark-up & negotiation", stageId: "negotiation", role: "Legal", blocking: true, requiresApproval: false },
  { title: "Closing checklist & funds flow", stageId: "closing", role: "Legal", blocking: true, requiresApproval: false },
];

const CAPITAL_RAISE: TemplateTask[] = [
  { title: "Kick-off call & raise sizing", stageId: "mandate", role: "MD", blocking: true, requiresApproval: false },
  { title: "Execute engagement letter", stageId: "mandate", role: "Legal", blocking: true, requiresApproval: true },
  { title: "Prepare NDA template for investors", stageId: "nda", role: "Legal", blocking: true, requiresApproval: false },
  { title: "Assemble company data pack", stageId: "data_room", role: "Analyst", blocking: true, requiresApproval: false },
  { title: "Build fundraising model", stageId: "modeling", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Cap table & dilution scenarios", stageId: "modeling", role: "Analyst", blocking: false, requiresApproval: true },
  { title: "Internal review of investor materials", stageId: "internal_review", role: "VP", blocking: true, requiresApproval: false },
  { title: "Draft investor deck", stageId: "client_materials", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Build investor target list", stageId: "client_materials", role: "Analyst", blocking: false, requiresApproval: true },
  { title: "Negotiate term sheet", stageId: "negotiation", role: "MD", blocking: true, requiresApproval: false },
  { title: "Subscription documents & closing", stageId: "closing", role: "Legal", blocking: true, requiresApproval: false },
];

const RESTRUCTURING: TemplateTask[] = [
  { title: "Kick-off & situation assessment", stageId: "mandate", role: "MD", blocking: true, requiresApproval: false },
  { title: "Execute engagement letter", stageId: "mandate", role: "Legal", blocking: true, requiresApproval: true },
  { title: "NDA with creditor groups", stageId: "nda", role: "Legal", blocking: true, requiresApproval: false },
  { title: "13-week cash flow forecast", stageId: "data_room", role: "Analyst", blocking: true, requiresApproval: true },
  { title: "Debt capacity & scenario modeling", stageId: "modeling", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Review restructuring options memo", stageId: "internal_review", role: "VP", blocking: true, requiresApproval: false },
  { title: "Lender / creditor presentation", stageId: "client_materials", role: "Associate", blocking: true, requiresApproval: true },
  { title: "Negotiate with creditor committees", stageId: "negotiation", role: "MD", blocking: true, requiresApproval: false },
  { title: "Implementation & documentation", stageId: "closing", role: "Legal", blocking: true, requiresApproval: false },
];

export const TEMPLATES: Record<DealType, TemplateTask[]> = {
  "Sell-side M&A": SELL_SIDE,
  "Buy-side M&A": BUY_SIDE,
  "Capital Raise": CAPITAL_RAISE,
  Restructuring: RESTRUCTURING,
};

/** Fallback ladder when the preferred role isn't on the team. */
export const ROLE_FALLBACK: Record<Role, Role[]> = {
  MD: ["MD", "Director", "VP"],
  Director: ["Director", "VP", "MD"],
  VP: ["VP", "Director", "Associate"],
  Associate: ["Associate", "Analyst", "VP"],
  Analyst: ["Analyst", "Associate"],
  Legal: ["Legal", "Associate"],
};
