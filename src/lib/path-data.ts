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
    req: "",
    actions: [
      { id: "read-book", label: "Read Quick-Start Guide", action: "open-pamphlet" },
      { id: "sign-up", label: "Register as Guest", next: "guest", requires: "signup-form", dependsOn: "read-book" }
    ],
    panelPos: "right"
  },
  {
    id: "node-guest",
    level: 2,
    pathPos: 0.20,
    title: "Guest",
    req: "",
    actions: [
      { id: "read-full-book", label: "Read the Source Book", action: "open-full-book" },
      { id: "complete-tutorial", label: "Take the Tutorial", next: "graduate", requires: "tutorial", dependsOn: "read-full-book" }
    ],
    panelPos: "left"
  },
  {
    id: "node-graduate",
    level: 3,
    pathPos: 0.40,
    title: "Graduate",
    req: "",
    actions: [
      { id: "join-tribe", label: "Join a Tribe", next: "member" },
      { id: "start-tribe", label: "Start a Tribe", next: "chief" }
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
