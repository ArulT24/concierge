/**
 * Presentation demo: each scenario = one user message → agent reply →
 * concrete actions + dashboard deltas (what recruiters see on a screen share).
 */

export type CultureCategory =
  | "milestone"
  | "offsite"
  | "in_office"
  | "large_event";

export type DashboardLine = {
  id: string;
  label: string;
  detail?: string;
  state: "idle" | "queued" | "in_progress" | "done";
};

export type CcoScenario = {
  id: string;
  category: CultureCategory;
  title: string;
  shortLabel: string;
  userMessage: string;
  agentReply: string;
  /** Bullet list: what the agent actually does (automation story). */
  agentActions: string[];
  /** How the dashboard reflects this (after the agent runs). */
  dashboardAfter: DashboardLine[];
};

export const CCO_SCENARIOS: CcoScenario[] = [
  {
    id: "milestone-birthday",
    category: "milestone",
    title: "Personal milestone",
    shortLabel: "Birthday",
    userMessage:
      "Alex in Product has a birthday next Tuesday. Can we do something nice without a big production?",
    agentReply:
      "Done. I used Alex’s profile (dietary prefs, office vs remote, travel) and your milestone policy. I scheduled a cupcake + small card for Tuesday, penciled a team shout-out in #product, and opened a vendor task if they’re traveling that week.",
    agentActions: [
      "Parsed intent: birthday milestone for a named employee + date window.",
      "Looked up Alex: team, location, OOO/travel flags, dietary notes.",
      "Applied policy: cupcake + handwritten card; escalation if travel.",
      "Created work order: bakery pickup or routed delivery to alternate address.",
      "Drafted Slack + email nudges to manager and office point-of-contact.",
      "Logged dashboard item: Milestone · Alex · Tue · Status: scheduled",
    ],
    dashboardAfter: [
      {
        id: "d1",
        label: "Milestone queue",
        detail: "Alex · Birthday · Tue · Cupcake + card",
        state: "in_progress",
      },
      {
        id: "d2",
        label: "Comms",
        detail: "Manager ping + #product shout-out draft",
        state: "queued",
      },
      {
        id: "d3",
        label: "Vendor / logistics",
        detail: "Bakery or local partner · Needs confirm if travel",
        state: "queued",
      },
    ],
  },
  {
    id: "offsite-team",
    category: "offsite",
    title: "Team offsite",
    shortLabel: "Offsite",
    userMessage:
      "Engineering wants a casual team night in SF next month: dinner, maybe mini golf or drinks after. Budget is flexible but keep it under $150/person.",
    agentReply:
      "Locked a shortlist: walkable dinner → optional mini golf → cocktail room. I held two reservation windows, sent a calendar poll for availability, and built a spend estimate with tax and tip so finance can approve in one click.",
    agentActions: [
      "Extracted: city, headcount estimate, vibe (casual), budget cap per person.",
      "Generated 3 route options (dinner + activity + nightcap) with travel time checks.",
      "Created calendar holds + Doodle-style poll linked in dashboard.",
      "Attached vendor contacts, deposit terms, and cancellation windows.",
      "Posted Finance summary: $/person, total, approval link.",
    ],
    dashboardAfter: [
      {
        id: "d1",
        label: "Offsite · SF · Eng",
        detail: "3 route options · Poll out",
        state: "in_progress",
      },
      {
        id: "d2",
        label: "Budget",
        detail: "≤ $150/pp · estimate attached",
        state: "done",
      },
      {
        id: "d3",
        label: "Calendar",
        detail: "Two holds · Awaiting RSVPs",
        state: "queued",
      },
    ],
  },
  {
    id: "in-office-social",
    category: "in_office",
    title: "In-office games",
    shortLabel: "In-office",
    userMessage:
      "We need something fun this Friday for ~30 people in the office. Not another happy hour—maybe a game? Mafia, imposter, something like that.",
    agentReply:
      "I set up a 90-minute social block: icebreaker → moderated Mafia/Imposter hybrid with printed roles → quick scavenger hunt for swag. Room booked, supplies list sent to office ops, and RSVP link posted.",
    agentActions: [
      "Matched request to in-office playbook: group size, space, noise level.",
      "Chose game arc: Mafia/Imposter + optional scavenger for movement.",
      "Booked room / floor timing; checked AV and seating layout.",
      "Generated host script + rules PDF + printable role cards.",
      "Opened RSVP + reminder schedule (T-3d, T-24h).",
    ],
    dashboardAfter: [
      {
        id: "d1",
        label: "In-office · Fri",
        detail: "Mafia / Imposter · 90 min",
        state: "in_progress",
      },
      {
        id: "d2",
        label: "Ops",
        detail: "Room + supplies checklist",
        state: "queued",
      },
      {
        id: "d3",
        label: "RSVPs",
        detail: "30 invites · reminders scheduled",
        state: "queued",
      },
    ],
  },
  {
    id: "large-soiree",
    category: "large_event",
    title: "Large event",
    shortLabel: "Soirée",
    userMessage:
      "Leadership wants a real soiree in June with a short program, then an afterparty. We care about employer brand and candidate experience—not a boring conference.",
    agentReply:
      "I drafted a two-venue flow: reception + program → handoff to afterparty with DJ. Run-of-show, vendor stack, and sponsor touchpoints are in the dashboard; next step is leadership review and deposit schedule.",
    agentActions: [
      "Structured event: narrative arc, brand moments, candidate journey.",
      "Split venues: main program vs afterparty; timing and transport buffer.",
      "Built vendor stack: venue, AV, catering, bar, talent, photo/video.",
      "Created stakeholder checklist: exec remarks, talent branding, RSVP tiers.",
      "Set risk log: capacity, noise, curfew, contingency indoor plan.",
    ],
    dashboardAfter: [
      {
        id: "d1",
        label: "June soirée + afterparty",
        detail: "Run-of-show v1 · Review",
        state: "in_progress",
      },
      {
        id: "d2",
        label: "Vendors",
        detail: "Stack ranked · Deposits pending",
        state: "queued",
      },
      {
        id: "d3",
        label: "Brand + talent",
        detail: "Talking points + photo moments",
        state: "queued",
      },
    ],
  },
];

export const CATEGORY_COPY: Record<
  CultureCategory,
  { headline: string; examples: string }
> = {
  milestone: {
    headline: "Personal employee milestones",
    examples: "Birthdays, work anniversaries, promotions, farewells",
  },
  offsite: {
    headline: "Team offsite activities",
    examples: "Mini golf, dinner, drinks, comedy, walking routes",
  },
  in_office: {
    headline: "In-office games & social",
    examples: "Mafia, Imposter, scavenger hunts, 20 questions, clues",
  },
  large_event: {
    headline: "Larger company events",
    examples: "Soirées, afterparties, recruitment dinners",
  },
};
