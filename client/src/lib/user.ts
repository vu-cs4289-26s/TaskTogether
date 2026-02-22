import type { User } from '@/types/user';
import { getCurrentUserMock } from './mockUser';
import { getCurrentUserApi } from './user.api';

const USE_MOCK =
  process.env.NEXT_PUBLIC_USE_MOCK === 'true' ||
  process.env.NODE_ENV !== 'production';

export function getCurrentUser(): Promise<User> {
  return getCurrentUserApi();
}
