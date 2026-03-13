
export type PathAction = {
  id: string;
  label: string;
  action?: string;
  next?: string;
  requires?: string;
  dependsOn?: string;
  targetView?: string;
  optional?: boolean;
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
    description: "Welcome to the Tribe Path! To find out how the Tribe works, read the Quick-Start Guide. Then, to proceed, register as a Guest.",
    actions: [
      { id: "read-book", label: "Read the Quick-Start Guide", action: "open-pamphlet" },
      { id: "sign-up", label: "Register as a Guest", next: "guest", requires: "signup-form", dependsOn: "read-book" }
    ],
    panelPos: "right"
  },
  {
    id: "node-guest",
    level: 2,
    pathPos: 0.20,
    title: "Guest",
    req: "",
    description: "As a guest, you have access to Tribe resources, such as The Chief, The Library, The Forum, and especially, the Trading Tribe Communication Model. Then, you may apply to join a Tribe or to start one of your own.",
    actions: [
      { id: "embrace-customs", label: "Study the Trading Tribe Communication Model", action: "navigate-customs" },
      { id: "visit-library", label: "Inspect the Resources (Optional)", action: "visit-library", optional: true },
      { id: "register-as-applicant", label: "Register as an Applicant", action: "open-profile-form", next: "applicant" }
    ],
    panelPos: "left"
  },
  {
    id: "node-applicant",
    level: 3,
    pathPos: 0.40,
    title: "Applicant",
    req: "",
    description: "As an Applicant, you have your own Trading Tribe Account that you can access on the Resources Menu (upper left) under \"My Account.\" You may also apply to join a Tribe, run a Tribe as its Chief or serve as a Mentor to help new Chiefs learn the ropes.",
    actions: [
      { id: "go-to-my-account-applicant", label: "Go to My Account", action: "navigate-my-tribe", targetView: "my-profile" },
      { id: "join-tribe", label: "Apply to Join a Tribe", action: "navigate-my-tribe", targetView: "find-or-start-tribe" },
      { id: "start-tribe", label: "Apply to Start a Tribe", action: "navigate-my-tribe", targetView: "find-or-start-tribe" },
      { id: "apply-for-mentor-applicant", label: "Apply to Serve as a Mentor", action: "navigate-my-tribe", targetView: "my-profile" }
    ],
    panelPos: "right"
  },
  {
    id: "node-member",
    level: 4,
    pathPos: 0.60,
    title: "Tribe Member",
    req: "",
    description: "As a member of a Tribe, you have your own page for checking the meeting schedule and for documenting your progress (in the anonymous Forum) to inspire others.",
    actions: [
      { id: "go-to-my-account-member", label: "Go to My Account", action: "navigate-my-tribe", targetView: "my-tribe" }
    ],
    panelPos: "left"
  },
  {
    id: "node-chief",
    level: 5,
    pathPos: 0.8,
    title: "Tribe Chief",
    req: "",
    description: "As a Tribe Chief, you have your own page to help manage your Tribe.",
    actions: [
      { id: "go-to-my-account-chief", label: "Go to My Account", action: "navigate-my-tribe", targetView: "chief-dashboard" }
    ],
    panelPos: "right"
  },
  {
    id: "node-mentor",
    level: 6,
    pathPos: 1.0,
    title: "Mentor",
    req: "",
    description: "As a Mentor, you help new Chiefs learn to run their Tribes.",
    actions: [
      { id: "go-to-my-account-mentor", label: "Go to My Account", action: "navigate-my-tribe", targetView: "mentor-dashboard" }
    ],
    panelPos: "left"
  }
];
