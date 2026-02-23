// Matches backend userSelect: { id, name, email, avatar }
export interface UserSummary {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

// Matches backend HouseholdMember with included user
export interface HouseholdMember {
  id: string;
  role: 'ADMIN' | 'MEMBER';
  userId: string;
  householdId: string;
  createdAt: string;
  user: UserSummary;
}

// Matches GET /api/households and GET /api/households/:id
export interface Household {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  myRole: 'ADMIN' | 'MEMBER';
  members: HouseholdMember[];
}

// Pagination metadata from backend
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// Helper: derive initials from a full name
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper: deterministic avatar color from user ID
const AVATAR_COLORS = ['#5A7C5E', '#B85C4A', '#4A7C5A', '#C49347', '#6E6E70', '#7B5EA7'];

export function getAvatarColor(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
