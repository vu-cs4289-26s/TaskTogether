import type { User } from '@/types/user';
import { getMockLoggedInUserId } from './mockAuth';

const USERS_KEY = 'tt_mock_users_v1';

type StoredUsers = Record<string, User>;

function readUsers(): StoredUsers {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(USERS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredUsers;
  } catch {
    return {};
  }
}

function writeUsers(users: StoredUsers) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function getUserByEmail(email: string): User | null {
  const users = readUsers();
  const target = normalizeEmail(email);
  return Object.values(users).find((u) => normalizeEmail(u.email) === target) ?? null;
}

export function createMockUser(input: { name: string; email: string }): User {
  const users = readUsers();
  const email = normalizeEmail(input.email);

  const existing = Object.values(users).find((u) => normalizeEmail(u.email) === email);
  if (existing) return existing;

  const id = `u_${crypto.randomUUID?.() ?? Math.random().toString(16).slice(2)}`;

  const user: User = {
    id,
    name: input.name.trim(),
    email,
    createdAt: new Date().toISOString(),
  };

  users[id] = user;
  writeUsers(users);
  return user;
}

export async function getCurrentUserMock(): Promise<User> {
  await new Promise((r) => setTimeout(r, 150));

  const id = getMockLoggedInUserId();
  if (!id) throw new Error('Not logged in');

  const users = readUsers();
  const user = users[id];
  if (!user) throw new Error('Mock user not found');
  return user;
}