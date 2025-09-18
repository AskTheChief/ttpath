export const levels = ['Visitor', 'Guest', 'Candidate', 'Member', 'Chief', 'Mentor'] as const;
export type Level = typeof levels[number];

export const requirements = [
  'sign-up', 'read-book', 'complete-tutorial', 'read-full-book', 'chat-chief',
  'join-tribe', 'start-tribe', 'get-badge'
] as const;
export type Requirement = typeof requirements[number];

export type CompletedRequirements = Partial<Record<Requirement, boolean>>;

export type User = {
  level: Level;
  completedRequirements: CompletedRequirements;
};
