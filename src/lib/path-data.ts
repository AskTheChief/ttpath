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
  description: string;
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
    description: "Welcome to the Tribe Path. To find out how the Tribe works, read the Quick-Start Guide. Then, if you wish to proceed, you may register as a Guest. As a guest, you have access to Tribe resources, such as The Chief, The Library, Feedback, Trading, Games and The Store. You may also proceed along the path to join a Tribe or to run one as a Chief.",
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
    description: "",
    actions: [
      { id: "read-full-book", label: "Read the Trading Tribe Book", action: "open-full-book" },
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
    description: "As a Graduate, you now participate fully. You can apply to join an existing Tribe or take the initiative to start your own.",
    actions: [
      { id: "go-to-my-tribe", label: "Join or Start a Tribe", action: "navigate-my-tribe" },
    ],
    panelPos: "right"
  },
  {
    id: "node-member",
    level: 4,
    pathPos: 0.60,
    title: "Tribe Member",
    req: "",
    description: "You are now a member of a Tribe. Participate in meetings, support your fellow members, and continue your journey of growth.",
    actions: [
      { id: "go-to-page", label: "Go to my page" }
    ],
    panelPos: "left"
  },
  {
    id: "node-chief",
    level: 5,
    pathPos: 0.8,
    title: "Tribe Chief",
    req: "",
    description: "As Chief, you lead your Tribe. You are responsible for holding meetings, guiding members, and maintaining the Tribe's focus.",
    actions: [
      { id: "go-to-page", label: "Go to my page" }
    ],
    panelPos: "right"
  },
  {
    id: "node-mentor",
    level: 6,
    pathPos: 1.0,
    title: "Mentor",
    req: "",
    description: "As a Mentor, you have achieved a high level of understanding and now guide new Chiefs, helping to grow the wider Tribe community.",
    actions: [
      { id: "go-to-page", label: "Go to my page" }
    ],
    panelPos: "left"
  }
];
