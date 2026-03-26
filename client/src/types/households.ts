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
//edited to account for edge cases
export function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// Helper: deterministic avatar color from user ID
//added more colors
const AVATAR_COLORS = [
  '#5A7C5E', // sage
  '#B85C4A', // terracotta
  '#6B8BA4', // dusty blue
  '#D1A054', // mustard
  '#7C5B8C', // plum
  '#5F6B7A', // slate
  '#C06C84', // rose
  '#4F9A94', // teal
  '#6C7BD0', // indigo
  '#D87C6A', // coral
  '#7A8F4E', // olive
  '#5AA6C8', // sky
];

//edited to export into appnavbar and profile page.
function hashString(value: string): number {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export function getAvatarColor(userKey?: string | null): string {
  const safeKey = (userKey ?? '').trim();
  if (!safeKey) return AVATAR_COLORS[0];
  return AVATAR_COLORS[hashString(safeKey) % AVATAR_COLORS.length];
}
