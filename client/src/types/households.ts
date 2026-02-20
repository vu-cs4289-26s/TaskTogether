export type HouseholdMember = {
  initials: string;
  color?: string; // Optional color for avatar background
};

export type HouseholdStats = {
  activeChores: number;
  openIssues: number;
  thisMonth: number;
};

export type Household = {
  id: string;
  name: string;
  description?: string;
  memberCount: number;
  isAdmin: boolean;
  members: HouseholdMember[];
  stats: HouseholdStats;
};
