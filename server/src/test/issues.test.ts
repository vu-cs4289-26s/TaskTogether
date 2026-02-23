import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { createUser, createHousehold, inviteAndJoin, auth } from './helpers.js';

// Helper to build issue API paths
function issuesUrl(householdId: string, suffix = '') {
  return `/api/households/${householdId}/issues${suffix}`;
}

let adminToken: string;
let memberToken: string;
let householdId: string;
let adminId: string;
let memberId: string;

beforeEach(async () => {
  const admin = await createUser();
  adminToken = admin.token;
  adminId = admin.user.id;

  const hh = await createHousehold(adminToken);
  householdId = hh.id;

  const member = await inviteAndJoin(adminToken, householdId);
  memberToken = member.token;
  memberId = member.user.id;
});

// ============================================
// TODO (Sahnee): Implement all tests below
// Reference: server/src/test/tasks.test.ts for patterns
// ============================================

describe('POST /issues -- create issue', () => {
  it.todo('member creates issue -- 201');
  it.todo('rejects empty title -- 400');
  it.todo('non-member cannot create -- 403');
  it.todo('includes reportedBy in response');
});

describe('GET /issues -- list issues', () => {
  it.todo('returns paginated issues');
  it.todo('filters by status');
  it.todo('orders by createdAt desc');
});

describe('GET /issues/:issueId -- get single issue', () => {
  it.todo('returns issue with comments');
  it.todo('returns 404 for non-existent issue');
  it.todo('returns 403 for non-member');
});

describe('PUT /issues/:issueId -- update issue', () => {
  it.todo('reporter can update title and description');
  it.todo('admin can update status');
  it.todo('other member cannot update -- 403');
});

describe('DELETE /issues/:issueId -- delete issue', () => {
  it.todo('admin can delete -- 204');
  it.todo('member cannot delete -- 403');
});

describe('POST /issues/:issueId/comments -- add comment', () => {
  it.todo('member adds comment -- 201');
  it.todo('rejects empty content -- 400');
  it.todo('non-member cannot comment -- 403');
});

describe('GET /issues/:issueId/comments -- list comments', () => {
  it.todo('returns comments in chronological order');
  it.todo('includes user details for each comment');
});
