import type { UserSummary } from './households';

// Mirrors Prisma IssueStatus enum
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';
export type IssuePriority = 'URGENT' | 'MEDIUM' | 'LOW';
export type IssueType =
  | 'MAINTENANCE'
  | 'HOUSEMATE_CONFLICT'
  | 'NOISE_COMPLAINT'
  | 'CLEANLINESS'
  | 'OTHER';

export interface IssueComment {
  id: string;
  content: string;
  photoUrl: string | null;
  issueId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  user: UserSummary;
}

export interface Issue {
  id: string;
  title: string;
  description: string | null;
  photoUrl: string | null;

  status: IssueStatus;
  type: IssueType;
  priority: IssuePriority;
  isAnonymous: boolean;

  reportedById: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;

  reportedBy: UserSummary;
  comments: IssueComment[];
}

export interface CreateIssueInput {
  title: string;
  type: IssueType;
  priority: IssuePriority;

  description?: string | null;  // optional
  photoUrl?: string | null;
  isAnonymous?: boolean;        // optional with default false server-side
}

export interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  photoUrl?: string | null;
  status?: IssueStatus;
  type?: IssueType;
  priority?: IssuePriority;
  isAnonymous?: boolean;
}

export interface CreateIssueCommentInput {
  content: string;
  photoUrl?: string;
}
