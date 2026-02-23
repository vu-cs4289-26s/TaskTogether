import { createMockUser, getUserByEmail } from './mockUser';

const KEY = 'tt_current_user_id_v1';

export function setMockLoggedIn(userId: string) {
  localStorage.setItem(KEY, userId);
}

export function getMockLoggedInUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(KEY);
}

export function clearMockLogin() {
  localStorage.removeItem(KEY);
}

export async function registerMock(name: string, email: string, password: string) {
  await new Promise((r) => setTimeout(r, 150));
  const user = createMockUser({ name, email });
  setMockLoggedIn(user.id);
  return user;
}

export async function loginMock(email: string, password: string) {
  await new Promise((r) => setTimeout(r, 150));
  const user = getUserByEmail(email);
  if (!user) throw new Error('No account found for that email.');
  setMockLoggedIn(user.id);
  return user;
}

export async function logoutMock() {
  await new Promise((r) => setTimeout(r, 50));
  clearMockLogin();
}
