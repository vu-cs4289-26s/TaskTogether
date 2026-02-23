import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import { createUser, createHousehold, inviteAndJoin, auth } from './helpers.js';

// Helper to build activity API paths
function activitiesUrl(householdId: string, suffix = '') {
  return `/api/households/${householdId}/activities${suffix}`;
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
// TODO (Emily): Implement all tests below
// Reference: server/src/test/tasks.test.ts for patterns
// ============================================

describe('POST /activities -- create activity', () => {
  it.todo('member creates activity -- 201');
  it.todo('rejects empty title -- 400');
  it.todo('rejects invalid activityType -- 400');
  it.todo('rejects invalid scheduledAt -- 400');
  it.todo('creates with participant list -- 201');
  it.todo('non-member cannot create -- 403');
});

describe('GET /activities -- list activities', () => {
  it.todo('returns paginated activities');
  it.todo('filters by status');
  it.todo('filters by activityType');
  it.todo('orders by scheduledAt asc');
});

describe('GET /activities/:activityId -- get single activity', () => {
  it.todo('returns activity with participants and checkIns');
  it.todo('returns 404 for non-existent activity');
  it.todo('returns 403 for non-member');
});

describe('PUT /activities/:activityId -- update activity', () => {
  it.todo('admin can update all fields');
  it.todo('other member cannot update -- 403');
});

describe('DELETE /activities/:activityId -- delete activity', () => {
  it.todo('admin can delete -- 204');
  it.todo('member cannot delete -- 403');
});

describe('POST /activities/:activityId/join -- join activity', () => {
  it.todo('member joins activity -- 200');
  it.todo('prevents duplicate join -- 409');
  it.todo('non-member cannot join -- 403');
});

describe('POST /activities/:activityId/leave -- leave activity', () => {
  it.todo('participant leaves activity -- 200');
  it.todo('non-participant cannot leave -- 400');
});

describe('POST /activities/:activityId/check-in -- check in', () => {
  it.todo('participant checks in -- 201');
  it.todo('accepts photo and notes -- 201');
  it.todo('non-participant cannot check in -- 403');
});
