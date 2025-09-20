export type PathAction = {
  id: string;
  label: string;
  action?: string;
  next?: string;
  requires?: string;
  dependsOn?: string;
};

export type PathNodeData = {
  id: string;
  level: number;
  pathPos: number;
  title: string;
  req: string;
  actions: PathAction[];
  panelPos: 'left' | 'right';
};

export const pathNodesData: PathNodeData[] = [
  {
    id: "node-visitor",
    level: 1,
    pathPos: 0.0,
    title: "Visitor",
    req: "None",
    actions: [
      { id: "read-book", label: "Read the short intro book", action: "open-pamphlet" },
      { id: "sign-up", label: "Sign Up", next: "guest", requires: "signup-form", dependsOn: "read-book" }
    ],
    panelPos: "right"
  },
  {
    id: "node-guest",
    level: 2,
    pathPos: 0.20,
    title: "Guest",
    req: "Sign Up",
    actions: [
      { id: "read-full-book", label: "Read the full book", action: "open-full-book" },
      { id: "complete-tutorial", label: "Become a Graduate", next: "graduate", requires: "tutorial", dependsOn: "read-full-book" }
    ],
    panelPos: "left"
  },
  {
    id: "node-graduate",
    level: 3,
    pathPos: 0.40,
    title: "Graduate",
    req: "Complete the Tutorial",
    actions: [
      { id: "join-tribe", label: "Join a Tribe as a Member", next: "member" },
      { id: "start-tribe", label: "Run a Tribe as a Chief", next: "chief" }
    ],
    panelPos: "right"
  },
  {
    id: "node-member",
    level: 4,
    pathPos: 0.60,
    title: "Tribe Member",
    req: "Acceptance by Chief",
    actions: [
      { id: "attend", label: "Attend Tribe Meetings" },
      { id: "become-mentor", label: "Become a Mentor", next: "mentor" }
    ],
    panelPos: "left"
  },
  {
    id: "node-chief",
    level: 5,
    pathPos: 0.8,
    title: "Chief",
    req: "Chosen by Tribe",
    actions: [
      { id: "lead", label: "Lead a Tribe" },
      { id: "review", label: "Review Applications" }
    ],
    panelPos: "right"
  },
  {
    id: "node-mentor",
    level: 6,
    pathPos: 1.0,
    title: "Mentor",
    req: "Chief Acceptance",
    actions: [
      { id: "guide", label: "Guide new Chiefs" },
      { id: "wisdom", label: "Provide wisdom" }
    ],
    panelPos: "left"
  }
];
