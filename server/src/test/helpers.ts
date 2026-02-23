import request from 'supertest';
import app from '../index.js';

let userCounter = 0;

/** Register a new user and return their JWT token + user record. */
export async function createUser(overrides: { name?: string; email?: string; password?: string } = {}) {
  userCounter++;
  const data = {
    name: overrides.name ?? `Test User ${userCounter}`,
    email: overrides.email ?? `testuser${userCounter}-${Date.now()}@example.com`,
    password: overrides.password ?? 'password123',
  };

  const res = await request(app).post('/api/auth/register').send(data);
  if (res.status !== 201) {
    throw new Error(`createUser failed: ${JSON.stringify(res.body)}`);
  }

  return {
    token: res.body.data.token as string,
    user: res.body.data.user as { id: string; name: string; email: string; avatar: string | null },
    password: data.password,
  };
}

/** Create a household as a given user and return the household record. */
export async function createHousehold(token: string, name = 'Test Household') {
  const res = await request(app)
    .post('/api/households')
    .set('Authorization', `Bearer ${token}`)
    .send({ name });
  if (res.status !== 201) {
    throw new Error(`createHousehold failed: ${JSON.stringify(res.body)}`);
  }
  return res.body.data as { id: string; name: string };
}

/**
 * Create a new user and have them join a household via an admin-generated invite.
 * Returns the new user's token and user record.
 */
export async function inviteAndJoin(adminToken: string, householdId: string) {
  const inviteRes = await request(app)
    .post(`/api/households/${householdId}/invites`)
    .set('Authorization', `Bearer ${adminToken}`);
  if (inviteRes.status !== 201) {
    throw new Error(`inviteAndJoin (generate invite) failed: ${JSON.stringify(inviteRes.body)}`);
  }

  const code: string = inviteRes.body.data.code;
  const { token, user } = await createUser();

  const joinRes = await request(app)
    .post(`/api/households/join/${code}`)
    .set('Authorization', `Bearer ${token}`);
  if (joinRes.status !== 200) {
    throw new Error(`inviteAndJoin (join) failed: ${JSON.stringify(joinRes.body)}`);
  }

  return { token, user };
}

/** Helper: auth header object for supertest. */
export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}
