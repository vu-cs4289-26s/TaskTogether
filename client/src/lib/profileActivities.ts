import type { Activity } from '@/types/activities';

const STORAGE_PREFIX = 'tasktogether:profile-activities:';

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`;
}

export function loadProfileActivities(userId: string): Activity[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Activity[]) : [];
  } catch {
    return [];
  }
}

export function saveProfileActivities(userId: string, activities: Activity[]) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(activities));
  } catch {
    // Ignore storage write failures in local dev.
  }
}
