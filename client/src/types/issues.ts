import type { UserSummary } from './households';

// Mirrors Prisma IssueStatus enum
export type IssueStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'ARCHIVED';

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
  reportedById: string;
  householdId: string;
  createdAt: string;
  updatedAt: string;
  reportedBy: UserSummary;
  comments: IssueComment[];
}

export interface CreateIssueInput {
  title: string;
  description?: string;
  photoUrl?: string;
}

export interface UpdateIssueInput {
  title?: string;
  description?: string | null;
  photoUrl?: string | null;
  status?: IssueStatus;
}

export interface CreateIssueCommentInput {
  content: string;
  photoUrl?: string;
}
