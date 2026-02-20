import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { createUser, createHousehold, inviteAndJoin, auth } from './helpers.js';

const api = (path: string) => `/api/households${path}`;

// ============================================
// Auth guard
// ============================================
describe('Auth guard', () => {
  it('GET /api/households without token → 401', async () => {
    const res = await request(app).get(api('/'));
    expect(res.status).toBe(401);
  });

  it('GET /api/households/:id without token → 401', async () => {
    const res = await request(app).get(api('/fake-id'));
    expect(res.status).toBe(401);
  });
});

// ============================================
// POST /api/households — Create
// ============================================
describe('POST /api/households', () => {
  it('valid name → 201, creator is ADMIN', async () => {
    const { token, user } = await createUser();
    const res = await request(app)
      .post(api('/'))
      .set(auth(token))
      .send({ name: 'My Home' });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('My Home');
    const member = res.body.data.members.find((m: { user: { id: string }; role: string }) => m.user.id === user.id);
    expect(member?.role).toBe('ADMIN');
  });

  it('missing name → 400 VALIDATION_ERROR', async () => {
    const { token } = await createUser();
    const res = await request(app).post(api('/')).set(auth(token)).send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('empty name → 400 VALIDATION_ERROR', async () => {
    const { token } = await createUser();
    const res = await request(app).post(api('/')).set(auth(token)).send({ name: '   ' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('name > 100 chars → 400 VALIDATION_ERROR', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post(api('/'))
      .set(auth(token))
      .send({ name: 'a'.repeat(101) });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ============================================
// GET /api/households — List
// ============================================
describe('GET /api/households', () => {
  it('returns only households the user belongs to', async () => {
    const { token } = await createUser();
    const { token: other } = await createUser();

    await createHousehold(token, 'My House');
    await createHousehold(other, 'Other House');

    const res = await request(app).get(api('/')).set(auth(token));
    expect(res.status).toBe(200);
    const names = res.body.data.map((h: { name: string }) => h.name);
    expect(names).toContain('My House');
    expect(names).not.toContain('Other House');
  });

  it('pagination: ?page=1&limit=1 returns correct meta', async () => {
    const { token } = await createUser();
    await createHousehold(token, 'House A');
    await createHousehold(token, 'House B');

    const res = await request(app).get(api('/?page=1&limit=1')).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.totalPages).toBe(2);
    expect(res.body.meta.page).toBe(1);
    expect(res.body.meta.limit).toBe(1);
  });
});

// ============================================
// GET /api/households/:id — Single household
// ============================================
describe('GET /api/households/:id', () => {
  it('member gets 200 with myRole', async () => {
    const { token } = await createUser();
    const hh = await createHousehold(token);
    const res = await request(app).get(api(`/${hh.id}`)).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.myRole).toBe('ADMIN');
  });

  it('non-member gets 403 HOUSEHOLD_UNAUTHORIZED', async () => {
    const { token: admin } = await createUser();
    const { token: stranger } = await createUser();
    const hh = await createHousehold(admin);
    const res = await request(app).get(api(`/${hh.id}`)).set(auth(stranger));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('HOUSEHOLD_UNAUTHORIZED');
  });

  it('bad ID → 404 HOUSEHOLD_NOT_FOUND', async () => {
    const { token } = await createUser();
    const res = await request(app).get(api('/nonexistent-id-1234')).set(auth(token));
    expect(res.status).toBe(404);
  });
});

// ============================================
// PUT /api/households/:id — Update
// ============================================
describe('PUT /api/households/:id', () => {
  it('admin updates name → 200', async () => {
    const { token } = await createUser();
    const hh = await createHousehold(token);
    const res = await request(app)
      .put(api(`/${hh.id}`))
      .set(auth(token))
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('member (non-admin) tries to update → 403 ADMIN_REQUIRED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: member } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .put(api(`/${hh.id}`))
      .set(auth(member))
      .send({ name: 'Hacked Name' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('empty name → 400 VALIDATION_ERROR', async () => {
    const { token } = await createUser();
    const hh = await createHousehold(token);
    const res = await request(app)
      .put(api(`/${hh.id}`))
      .set(auth(token))
      .send({ name: '' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ============================================
// DELETE /api/households/:id — Consensual delete
// ============================================
describe('DELETE /api/households/:id — consensual delete', () => {
  it('single admin: one DELETE → 204, household gone', async () => {
    const { token } = await createUser();
    const hh = await createHousehold(token);

    const del = await request(app).delete(api(`/${hh.id}`)).set(auth(token));
    expect(del.status).toBe(204);

    const check = await request(app).get(api(`/${hh.id}`)).set(auth(token));
    expect(check.status).toBe(404);
  });

  it('two admins: first DELETE → 202 with vote counts', async () => {
    const { token: admin1 } = await createUser();
    const hh = await createHousehold(admin1);
    const { token: admin2 } = await inviteAndJoin(admin1, hh.id);

    // Promote member to admin
    const memberRes = await request(app).get(api(`/${hh.id}/members`)).set(auth(admin1));
    const member2 = memberRes.body.data.find((m: { id: string; role: string }) => m.role === 'MEMBER');
    await request(app)
      .put(api(`/${hh.id}/members/${member2.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    const del1 = await request(app).delete(api(`/${hh.id}`)).set(auth(admin1));
    expect(del1.status).toBe(202);
    expect(del1.body.data.votesReceived).toBe(1);
    expect(del1.body.data.votesRequired).toBe(2);
  });

  it('two admins: both vote → 204, household deleted', async () => {
    const { token: admin1, user: user1 } = await createUser();
    const hh = await createHousehold(admin1);
    const { token: admin2, user: user2 } = await inviteAndJoin(admin1, hh.id);

    // Promote user2 to admin
    await request(app)
      .put(api(`/${hh.id}/members/${user2.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    await request(app).delete(api(`/${hh.id}`)).set(auth(admin1));
    const del2 = await request(app).delete(api(`/${hh.id}`)).set(auth(admin2));
    expect(del2.status).toBe(204);
  });

  it('member tries to delete → 403 ADMIN_REQUIRED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: member } = await inviteAndJoin(admin, hh.id);

    const res = await request(app).delete(api(`/${hh.id}`)).set(auth(member));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('voting twice is idempotent — still 202 after second call', async () => {
    const { token: admin1 } = await createUser();
    const hh = await createHousehold(admin1);
    const { token: admin2, user: user2 } = await inviteAndJoin(admin1, hh.id);

    await request(app)
      .put(api(`/${hh.id}/members/${user2.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    await request(app).delete(api(`/${hh.id}`)).set(auth(admin1));
    const res = await request(app).delete(api(`/${hh.id}`)).set(auth(admin1));
    expect(res.status).toBe(202);
    expect(res.body.data.votesReceived).toBe(1); // still 1 vote, not 2
  });
});

// ============================================
// GET/DELETE /api/households/:id/delete-vote
// ============================================
describe('delete-vote status and retract', () => {
  it('admin can check vote status', async () => {
    const { token } = await createUser();
    const hh = await createHousehold(token);

    const before = await request(app).get(api(`/${hh.id}/delete-vote`)).set(auth(token));
    expect(before.status).toBe(200);
    expect(before.body.data.myVote).toBe(false);

    await request(app).delete(api(`/${hh.id}`)).set(auth(token));
    // Household was deleted (single admin), can't check after
  });

  it('admin can retract vote — myVote becomes false again', async () => {
    const { token: admin1 } = await createUser();
    const hh = await createHousehold(admin1);
    const { token: admin2, user: user2 } = await inviteAndJoin(admin1, hh.id);

    await request(app)
      .put(api(`/${hh.id}/members/${user2.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    // Vote
    await request(app).delete(api(`/${hh.id}`)).set(auth(admin1));

    const afterVote = await request(app).get(api(`/${hh.id}/delete-vote`)).set(auth(admin1));
    expect(afterVote.body.data.myVote).toBe(true);

    // Retract
    const retract = await request(app).delete(api(`/${hh.id}/delete-vote`)).set(auth(admin1));
    expect(retract.status).toBe(204);

    const afterRetract = await request(app).get(api(`/${hh.id}/delete-vote`)).set(auth(admin1));
    expect(afterRetract.body.data.myVote).toBe(false);
  });
});

// ============================================
// GET /api/households/:id/members
// ============================================
describe('GET /api/households/:id/members', () => {
  it('returns all members with role and joinedAt', async () => {
    const { token: admin, user: adminUser } = await createUser();
    const hh = await createHousehold(admin);
    const { user: memberUser } = await inviteAndJoin(admin, hh.id);

    const res = await request(app).get(api(`/${hh.id}/members`)).set(auth(admin));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);

    const adminMember = res.body.data.find((m: { id: string }) => m.id === adminUser.id);
    expect(adminMember.role).toBe('ADMIN');
    expect(adminMember.joinedAt).toBeDefined();

    const member = res.body.data.find((m: { id: string }) => m.id === memberUser.id);
    expect(member.role).toBe('MEMBER');
  });
});

// ============================================
// PUT /api/households/:id/members/:userId/role — Promote
// ============================================
describe('PUT /api/households/:id/members/:userId/role', () => {
  it('admin promotes MEMBER → 200, role is ADMIN', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { user: memberUser } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .put(api(`/${hh.id}/members/${memberUser.id}/role`))
      .set(auth(admin))
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('ADMIN');
  });

  it('promoting already-ADMIN is idempotent → 200', async () => {
    const { token: admin, user: adminUser } = await createUser();
    const hh = await createHousehold(admin);
    const { user: memberUser } = await inviteAndJoin(admin, hh.id);

    // Promote once
    await request(app)
      .put(api(`/${hh.id}/members/${memberUser.id}/role`))
      .set(auth(admin))
      .send({ role: 'ADMIN' });

    // Promote again — idempotent
    const res = await request(app)
      .put(api(`/${hh.id}/members/${memberUser.id}/role`))
      .set(auth(admin))
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(200);
  });

  it('trying to set role to MEMBER → 400 (demotion not permitted)', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { user: memberUser } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .put(api(`/${hh.id}/members/${memberUser.id}/role`))
      .set(auth(admin))
      .send({ role: 'MEMBER' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('admin tries to change own role → 400', async () => {
    const { token: admin, user: adminUser } = await createUser();
    const hh = await createHousehold(admin);

    const res = await request(app)
      .put(api(`/${hh.id}/members/${adminUser.id}/role`))
      .set(auth(admin))
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('member tries to promote → 403 ADMIN_REQUIRED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: member1 } = await inviteAndJoin(admin, hh.id);
    const { user: member2User } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .put(api(`/${hh.id}/members/${member2User.id}/role`))
      .set(auth(member1))
      .send({ role: 'ADMIN' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// ============================================
// DELETE /api/households/:id/members/:userId — Leave/Remove
// ============================================
describe('DELETE /api/households/:id/members/:userId', () => {
  it('admin removes MEMBER → 204', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { user: memberUser } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${memberUser.id}`))
      .set(auth(admin));
    expect(res.status).toBe(204);
  });

  it('admin tries to remove another ADMIN → 403 CANNOT_REMOVE_ADMIN', async () => {
    const { token: admin1 } = await createUser();
    const hh = await createHousehold(admin1);
    const { token: admin2Token, user: admin2User } = await inviteAndJoin(admin1, hh.id);

    await request(app)
      .put(api(`/${hh.id}/members/${admin2User.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${admin2User.id}`))
      .set(auth(admin1));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('CANNOT_REMOVE_ADMIN');
  });

  it('last admin tries to leave → 400 LAST_ADMIN_CANNOT_LEAVE', async () => {
    const { token: admin, user: adminUser } = await createUser();
    const hh = await createHousehold(admin);

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${adminUser.id}`))
      .set(auth(admin));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('LAST_ADMIN_CANNOT_LEAVE');
  });

  it('admin leaves when another admin exists → 204', async () => {
    const { token: admin1, user: admin1User } = await createUser();
    const hh = await createHousehold(admin1);
    const { user: memberUser } = await inviteAndJoin(admin1, hh.id);

    // Promote member to admin
    await request(app)
      .put(api(`/${hh.id}/members/${memberUser.id}/role`))
      .set(auth(admin1))
      .send({ role: 'ADMIN' });

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${admin1User.id}`))
      .set(auth(admin1));
    expect(res.status).toBe(204);
  });

  it('member leaves themselves → 204', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: memberToken, user: memberUser } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${memberUser.id}`))
      .set(auth(memberToken));
    expect(res.status).toBe(204);
  });

  it('member tries to remove someone else → 403 ADMIN_REQUIRED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: member1Token } = await inviteAndJoin(admin, hh.id);
    const { user: member2User } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .delete(api(`/${hh.id}/members/${member2User.id}`))
      .set(auth(member1Token));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// ============================================
// Invite system
// ============================================
describe('Invite system', () => {
  it('admin generates invite → 201, code is 8-char uppercase hex', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);

    const res = await request(app)
      .post(api(`/${hh.id}/invites`))
      .set(auth(admin));
    expect(res.status).toBe(201);
    expect(res.body.data.code).toMatch(/^[0-9A-F]{8}$/);
    expect(res.body.data.expiresAt).toBeDefined();
  });

  it('non-admin generates invite → 403 ADMIN_REQUIRED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);
    const { token: memberToken } = await inviteAndJoin(admin, hh.id);

    const res = await request(app)
      .post(api(`/${hh.id}/invites`))
      .set(auth(memberToken));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('user joins via valid code → 200, now a MEMBER', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);

    const inviteRes = await request(app)
      .post(api(`/${hh.id}/invites`))
      .set(auth(admin));
    const { code } = inviteRes.body.data;

    const { token: newUser } = await createUser();
    const joinRes = await request(app)
      .post(api(`/join/${code}`))
      .set(auth(newUser));
    expect(joinRes.status).toBe(200);

    const membersRes = await request(app).get(api(`/${hh.id}/members`)).set(auth(admin));
    expect(membersRes.body.data).toHaveLength(2);
  });

  it('joining with used code → 410 INVITE_USED', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);

    const inviteRes = await request(app)
      .post(api(`/${hh.id}/invites`))
      .set(auth(admin));
    const { code } = inviteRes.body.data;

    // Join once
    const { token: user1 } = await createUser();
    await request(app).post(api(`/join/${code}`)).set(auth(user1));

    // Try to join again with same code
    const { token: user2 } = await createUser();
    const res = await request(app).post(api(`/join/${code}`)).set(auth(user2));
    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('INVITE_USED');
  });

  it('already-member joins → 409 HOUSEHOLD_ALREADY_MEMBER', async () => {
    const { token: admin } = await createUser();
    const hh = await createHousehold(admin);

    const inviteRes = await request(app)
      .post(api(`/${hh.id}/invites`))
      .set(auth(admin));
    const { code } = inviteRes.body.data;

    // admin tries to join their own household
    const res = await request(app).post(api(`/join/${code}`)).set(auth(admin));
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('HOUSEHOLD_ALREADY_MEMBER');
  });

  it('invalid code → 404 INVITE_NOT_FOUND', async () => {
    const { token } = await createUser();
    const res = await request(app)
      .post(api('/join/INVALID1'))
      .set(auth(token));
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('INVITE_NOT_FOUND');
  });
});
