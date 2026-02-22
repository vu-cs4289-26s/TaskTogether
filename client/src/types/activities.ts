import type { UserSummary } from './households';

// Mirrors Prisma ActivityType enum
export type ActivityType = 'HOMEWORK' | 'BONDING' | 'CHORE' | 'OTHER';

// Mirrors Prisma ActivityStatus enum
export type ActivityStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ActivityParticipant {
  id: string;
  activityId: string;
  userId: string;
  createdAt: string;
  user: UserSummary;
}

export interface ActivityCheckIn {
  id: string;
  photoUrl: string | null;
  notes: string | null;
  checkedInAt: string;
  activityId: string;
  userId: string;
  user: UserSummary;
}

export interface Activity {
  id: string;
  title: string;
  description: string | null;
  activityType: ActivityType;
  status: ActivityStatus;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  householdId: string;
  createdAt: string;
  updatedAt: string;
  participants: ActivityParticipant[];
  checkIns: ActivityCheckIn[];
}

export interface CreateActivityInput {
  title: string;
  description?: string;
  activityType: ActivityType;
  scheduledAt: string; // ISO date string
  participantUserIds?: string[];
}

export interface UpdateActivityInput {
  title?: string;
  description?: string | null;
  activityType?: ActivityType;
  status?: ActivityStatus;
  scheduledAt?: string;
}

export interface CheckInInput {
  photoUrl?: string;
  notes?: string;
}
