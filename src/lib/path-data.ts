
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
      { id: "read-book", label: "Read the Quick-Start Guide", action: "open-pamphlet" },
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
      { id: "read-full-book", label: "Read Trading Tribe Methods", action: "open-full-book", next: "explorer" },
    ],
    panelPos: "left"
  },
  {
    id: "node-explorer",
    level: 3,
    pathPos: 0.40,
    title: "Explorer",
    req: "",
    description: "As an Explorer, you now have your own Trading Tribe Account that you can access below and also on the Menu (upper left) under \"My Account.\"\n\nOn your My Account page, you may edit your profile, comprehension test, Issue and Service Project. You may also apply to join a Tribe, run a Tribe as its Chief or serve as a Mentor to help new Chiefs learn the ropes.",
    actions: [
      { id: "read-full-book-part-2", label: "Read Trading Tribe Theory", action: "open-full-book-part-2"},
      { id: "open-comprehension-test", label: "Take The Tutorial", action: "open-comprehension-test", dependsOn: "read-full-book-part-2" },
      { id: "join-tribe", label: "Join or Start a Tribe", action: "navigate-my-tribe", dependsOn: "open-comprehension-test"}
    ],
    panelPos: "right"
  },
  {
    id: "node-member",
    level: 4,
    pathPos: 0.60,
    title: "Tribe Member",
    req: "",
    description: "You also have your own page for viewing the meeting schedule and for communicating with other Tribe members.",
    actions: [
      { id: "go-to-my-account-member", label: "Go to My Account", action: "navigate-my-tribe", next: "member" }
    ],
    panelPos: "left"
  },
  {
    id: "node-chief",
    level: 5,
    pathPos: 0.8,
    title: "Tribe Chief",
    req: "",
    description: "As a Tribe Chief, you lead your Tribe. You can also apply to become a Mentor to help other new Chiefs.",
    actions: [
      { id: "go-to-my-account-chief", label: "Go to My Account", action: "navigate-my-tribe" },
      { id: "apply-for-mentor", label: "Apply to be a Mentor", action: "navigate-my-tribe" }
    ],
    panelPos: "right"
  },
  {
    id: "node-mentor",
    level: 6,
    pathPos: 1.0,
    title: "Mentor",
    req: "",
    description: "As a Mentor, you help guide new Chiefs.",
    actions: [
      { id: "go-to-my-account-mentor", label: "Go to My Account", action: "navigate-my-tribe", next: "mentor" }
    ],
    panelPos: "left"
  }
];
