import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import prisma from '../lib/prisma.js';
import app from '../index.js';
import { createUser, createHousehold, inviteAndJoin, auth } from './helpers.js';

// Helpers
function tasksApi(householdId: string, suffix = '') {
  return `/api/households/${householdId}/tasks${suffix}`;
}

// ============================================
// Shared fixture
// ============================================
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
// POST / — Create task
// ============================================
describe('POST /tasks — create task', () => {
  it('any member creates task (no assignment) → 201, assignments: []', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Clean kitchen' });
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Clean kitchen');
    expect(res.body.data.assignments).toEqual([]);
  });

  it('admin assigns to member → 201, assignment created, notification in DB', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Take out trash', assignedToUserId: memberId });
    expect(res.status).toBe(201);
    expect(res.body.data.assignments).toHaveLength(1);
    expect(res.body.data.assignments[0].user.id).toBe(memberId);

    // Allow async notification to persist
    await new Promise((r) => setTimeout(r, 50));
    const notif = await prisma.notification.findFirst({
      where: { userId: memberId, type: 'TASK_ASSIGNED' },
    });
    expect(notif).not.toBeNull();
  });

  it('member self-assigns → 201', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Self task', assignedToUserId: memberId });
    expect(res.status).toBe(201);
    expect(res.body.data.assignments[0].user.id).toBe(memberId);
  });

  it('member tries to assign to other user → 403 FORBIDDEN_ASSIGNMENT', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Sneaky task', assignedToUserId: adminId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ASSIGNMENT');
  });

  it('non-member tries to create → 403', async () => {
    const { token: stranger } = await createUser();
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(stranger))
      .send({ title: 'Intruder task' });
    expect(res.status).toBe(403);
  });

  it('missing title → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ description: 'No title' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('isRecurring: true without recurrencePattern → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Bad recurring', isRecurring: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('invalid recurrencePattern → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Bad pattern', isRecurring: true, recurrencePattern: 'yearly' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('isRotating: true by member → 403 ADMIN_REQUIRED', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Rotating', isRotating: true, recurrencePattern: 'weekly' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('isRotating: true by admin without recurrencePattern → 400', async () => {
    const res = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Rotating bad', isRotating: true });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

// ============================================
// GET / — List tasks
// ============================================
describe('GET /tasks — list tasks', () => {
  it('returns tasks for household, not other households', async () => {
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'My task' });

    const { token: otherAdmin } = await createUser();
    const otherHh = await createHousehold(otherAdmin);
    await request(app)
      .post(tasksApi(otherHh.id))
      .set(auth(otherAdmin))
      .send({ title: 'Other task' });

    const res = await request(app).get(tasksApi(householdId)).set(auth(adminToken));
    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: { title: string }) => t.title);
    expect(titles).toContain('My task');
    expect(titles).not.toContain('Other task');
  });

  it('?assignedToMe=true filters correctly', async () => {
    // Create 2 tasks: one assigned to member, one not
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'My assigned', assignedToUserId: memberId });
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Unassigned task' });

    const res = await request(app)
      .get(tasksApi(householdId, '?assignedToMe=true'))
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    const titles = res.body.data.map((t: { title: string }) => t.title);
    expect(titles).toContain('My assigned');
    expect(titles).not.toContain('Unassigned task');
  });

  it('?unassigned=true returns only unassigned tasks', async () => {
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Assigned', assignedToUserId: memberId });
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Unassigned' });

    const res = await request(app)
      .get(tasksApi(householdId, '?unassigned=true'))
      .set(auth(adminToken));
    const titles = res.body.data.map((t: { title: string }) => t.title);
    expect(titles).toContain('Unassigned');
    expect(titles).not.toContain('Assigned');
  });

  it('?isRecurring=true filters correctly', async () => {
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Recurring', isRecurring: true, recurrencePattern: 'weekly' });
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'One-time' });

    const res = await request(app)
      .get(tasksApi(householdId, '?isRecurring=true'))
      .set(auth(adminToken));
    const titles = res.body.data.map((t: { title: string }) => t.title);
    expect(titles).toContain('Recurring');
    expect(titles).not.toContain('One-time');
  });

  it('pagination meta is correct', async () => {
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Task 1' });
    await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Task 2' });

    const res = await request(app)
      .get(tasksApi(householdId, '?page=1&limit=1'))
      .set(auth(adminToken));
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(2);
    expect(res.body.meta.totalPages).toBe(2);
  });
});

// ============================================
// GET /:taskId — Single task
// ============================================
describe('GET /tasks/:taskId', () => {
  it('member fetches task → 200 with creator and assignments', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Single task', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .get(tasksApi(householdId, `/${taskId}`))
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(res.body.data.creator).toBeDefined();
    expect(res.body.data.assignments).toHaveLength(1);
    expect(res.body.data.completions).toBeDefined();
  });

  it('task from another household → 404 TASK_NOT_FOUND', async () => {
    const { token: otherAdmin } = await createUser();
    const otherHh = await createHousehold(otherAdmin);
    const otherTask = await request(app)
      .post(tasksApi(otherHh.id))
      .set(auth(otherAdmin))
      .send({ title: 'Other task' });
    const otherTaskId = otherTask.body.data.id;

    // Admin of our household can't access other household's task
    const res = await request(app)
      .get(tasksApi(householdId, `/${otherTaskId}`))
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });

  it('nonexistent taskId → 404', async () => {
    const res = await request(app)
      .get(tasksApi(householdId, '/nonexistent-task-id'))
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});

// ============================================
// PUT /:taskId — Update task
// ============================================
describe('PUT /tasks/:taskId', () => {
  it('creator (non-admin member) updates own task → 200', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'My task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .put(tasksApi(householdId, `/${taskId}`))
      .set(auth(memberToken))
      .send({ title: 'Updated title' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Updated title');
  });

  it('admin updates any task → 200', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Member task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .put(tasksApi(householdId, `/${taskId}`))
      .set(auth(adminToken))
      .send({ title: 'Admin updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('Admin updated');
  });

  it('non-creator member updates another\'s task → 403 TASK_UPDATE_FORBIDDEN', async () => {
    const { token: member2Token } = await inviteAndJoin(adminToken, householdId);

    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'Member1 task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .put(tasksApi(householdId, `/${taskId}`))
      .set(auth(member2Token))
      .send({ title: 'Hacked' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TASK_UPDATE_FORBIDDEN');
  });

  it('setting isRotating: true by member → 403 ADMIN_REQUIRED', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(memberToken))
      .send({ title: 'My task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .put(tasksApi(householdId, `/${taskId}`))
      .set(auth(memberToken))
      .send({ isRotating: true, recurrencePattern: 'weekly' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });
});

// ============================================
// DELETE /:taskId — Delete task
// ============================================
describe('DELETE /tasks/:taskId', () => {
  it('admin deletes → 204', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Delete me' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .delete(tasksApi(householdId, `/${taskId}`))
      .set(auth(adminToken));
    expect(res.status).toBe(204);
  });

  it('member tries to delete → 403 ADMIN_REQUIRED', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Delete me' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .delete(tasksApi(householdId, `/${taskId}`))
      .set(auth(memberToken));
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ADMIN_REQUIRED');
  });

  it('task not in household → 404 TASK_NOT_FOUND', async () => {
    const res = await request(app)
      .delete(tasksApi(householdId, '/nonexistent-task'))
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});

// ============================================
// POST /:taskId/assign — Assign/unassign
// ============================================
describe('POST /tasks/:taskId/assign', () => {
  let taskId: string;

  beforeEach(async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Assignable task' });
    taskId = createRes.body.data.id;
  });

  it('admin assigns to member → 200, assignment created', async () => {
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(adminToken))
      .send({ assignedToUserId: memberId });
    expect(res.status).toBe(200);
    expect(res.body.data.assignments).toHaveLength(1);
    expect(res.body.data.assignments[0].user.id).toBe(memberId);
  });

  it('admin unassigns (null) → 200, no active assignments', async () => {
    // First assign
    await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(adminToken))
      .send({ assignedToUserId: memberId });

    // Then unassign
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(adminToken))
      .send({ assignedToUserId: null });
    expect(res.status).toBe(200);
    const activeAssignments = res.body.data.assignments.filter(
      (a: { status: string }) => a.status === 'PENDING' || a.status === 'IN_PROGRESS'
    );
    expect(activeAssignments).toHaveLength(0);
  });

  it('member self-assigns unassigned task → 200', async () => {
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(memberToken))
      .send({ assignedToUserId: memberId });
    expect(res.status).toBe(200);
  });

  it('member tries to assign to other → 403 FORBIDDEN_ASSIGNMENT', async () => {
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(memberToken))
      .send({ assignedToUserId: adminId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ASSIGNMENT');
  });

  it('member tries to self-assign already-assigned task → 403 TASK_ALREADY_ASSIGNED', async () => {
    // Admin assigns to member first
    await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(adminToken))
      .send({ assignedToUserId: adminId });

    // Member tries to self-assign
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(memberToken))
      .send({ assignedToUserId: memberId });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('TASK_ALREADY_ASSIGNED');
  });

  it('assignee not in household → 400 ASSIGNEE_NOT_MEMBER', async () => {
    const { user: stranger } = await createUser();
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/assign`))
      .set(auth(adminToken))
      .send({ assignedToUserId: stranger.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('ASSIGNEE_NOT_MEMBER');
  });
});

// ============================================
// POST /:taskId/complete — Complete task
// ============================================
describe('POST /tasks/:taskId/complete', () => {
  it('assigned member completes → 200, nextTask: null for non-recurring', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Clean dishes', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.completion).toBeDefined();
    expect(res.body.data.nextTask).toBeNull();
  });

  it('admin completes unassigned task → 200', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Admin task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(adminToken))
      .send({});
    expect(res.status).toBe(200);
  });

  it('non-assigned member tries to complete → 403 NOT_ASSIGNED', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Admin task' });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ASSIGNED');
  });

  it('completion with notes and photoUrl → stored in DB', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Photo task', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({ notes: 'Done!', photoUrl: 'https://example.com/photo.jpg' });

    const completion = await prisma.taskCompletion.findFirst({ where: { taskId } });
    expect(completion?.notes).toBe('Done!');
    expect(completion?.photoUrl).toBe('https://example.com/photo.jpg');
  });

  it('after completion, admins receive TASK_COMPLETED notification', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Notifiable task', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});

    await new Promise((r) => setTimeout(r, 100));

    const notif = await prisma.notification.findFirst({
      where: { userId: adminId, type: 'TASK_COMPLETED' },
    });
    expect(notif).not.toBeNull();
  });

  it('completer does NOT receive a TASK_COMPLETED notification', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Member completes', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});

    await new Promise((r) => setTimeout(r, 100));

    const notif = await prisma.notification.findFirst({
      where: { userId: memberId, type: 'TASK_COMPLETED' },
    });
    expect(notif).toBeNull();
  });
});

// ============================================
// Recurring task completion
// ============================================
describe('Recurring task completion', () => {
  it('complete a weekly recurring task → 200, nextTask is not null', async () => {
    const dueDate = new Date('2025-03-01T00:00:00Z').toISOString();
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'Weekly chore',
        isRecurring: true,
        recurrencePattern: 'weekly',
        dueDate,
        assignedToUserId: memberId,
      });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.nextTask).not.toBeNull();
    expect(res.body.data.nextTask.title).toBe('Weekly chore');
  });

  it('nextTask.dueDate is 7 days after original', async () => {
    const dueDate = new Date('2025-03-01T00:00:00Z');
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'Weekly chore',
        isRecurring: true,
        recurrencePattern: 'weekly',
        dueDate: dueDate.toISOString(),
        assignedToUserId: memberId,
      });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});

    const nextTaskId = res.body.data.nextTask.id;
    const nextTask = await prisma.task.findUnique({ where: { id: nextTaskId } });
    const expectedDue = new Date('2025-03-08T00:00:00Z');
    expect(nextTask?.dueDate?.toISOString()).toBe(expectedDue.toISOString());
  });

  it('non-rotating: next occurrence assigned to same assignee', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'My recurring',
        isRecurring: true,
        recurrencePattern: 'weekly',
        assignedToUserId: memberId,
      });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(memberToken))
      .send({});

    const nextTaskId = res.body.data.nextTask.id;
    const assignment = await prisma.taskAssignment.findFirst({
      where: { taskId: nextTaskId, status: 'PENDING' },
    });
    expect(assignment?.userId).toBe(memberId);
  });

  it('unassigned recurring task → next occurrence is also unassigned', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'Unassigned recurring',
        isRecurring: true,
        recurrencePattern: 'daily',
      });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(adminToken))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.nextTask).not.toBeNull();

    const nextTaskId = res.body.data.nextTask.id;
    const assignment = await prisma.taskAssignment.findFirst({
      where: { taskId: nextTaskId },
    });
    expect(assignment).toBeNull();
  });
});

// ============================================
// Rotating task completion
// ============================================
describe('Rotating task completion', () => {
  it('rotating task: next occurrence assigned to next member round-robin', async () => {
    // Household has admin (index 0) and member (index 1) by join order
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'Rotating chore',
        isRotating: true,
        recurrencePattern: 'weekly',
      });
    const taskId = createRes.body.data.id;

    // Admin completes the (unassigned) rotating task
    const res = await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(adminToken))
      .send({});
    expect(res.status).toBe(200);
    expect(res.body.data.nextTask).not.toBeNull();

    // Verify next task has an assignment
    const nextTaskId = res.body.data.nextTask.id;
    const assignment = await prisma.taskAssignment.findFirst({
      where: { taskId: nextTaskId },
    });
    expect(assignment).not.toBeNull();
  });

  it('rotationIndex on original task is updated after completion', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({
        title: 'Rotation index test',
        isRotating: true,
        recurrencePattern: 'weekly',
      });
    const taskId = createRes.body.data.id;

    await request(app)
      .post(tasksApi(householdId, `/${taskId}/complete`))
      .set(auth(adminToken))
      .send({});

    const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });
    expect(updatedTask?.rotationIndex).toBeGreaterThan(0);
  });
});

// ============================================
// GET /:taskId/assignments
// ============================================
describe('GET /tasks/:taskId/assignments', () => {
  it('returns all assignments (all statuses) with user info', async () => {
    const createRes = await request(app)
      .post(tasksApi(householdId))
      .set(auth(adminToken))
      .send({ title: 'Assignment history', assignedToUserId: memberId });
    const taskId = createRes.body.data.id;

    const res = await request(app)
      .get(tasksApi(householdId, `/${taskId}/assignments`))
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].user.id).toBe(memberId);
  });

  it('task from other household → 404', async () => {
    const { token: otherAdmin } = await createUser();
    const otherHh = await createHousehold(otherAdmin);
    const otherTaskRes = await request(app)
      .post(tasksApi(otherHh.id))
      .set(auth(otherAdmin))
      .send({ title: 'Other' });
    const otherTaskId = otherTaskRes.body.data.id;

    const res = await request(app)
      .get(tasksApi(householdId, `/${otherTaskId}/assignments`))
      .set(auth(adminToken));
    expect(res.status).toBe(404);
  });
});

// ============================================
// Notification endpoints
// ============================================
describe('Notification endpoints', () => {
  let notifHouseholdId: string;
  let notifAdminToken: string;
  let notifAdminId: string;
  let notifMemberToken: string;

  beforeEach(async () => {
    const admin = await createUser();
    notifAdminToken = admin.token;
    notifAdminId = admin.user.id;
    const hh = await createHousehold(notifAdminToken);
    notifHouseholdId = hh.id;
    const member = await inviteAndJoin(notifAdminToken, notifHouseholdId);
    notifMemberToken = member.token;

    // Create a task assigned to the member to generate a TASK_ASSIGNED notification
    await request(app)
      .post(tasksApi(notifHouseholdId))
      .set(auth(notifAdminToken))
      .send({ title: 'Notification task', assignedToUserId: member.user.id });

    // Wait for async notification
    await new Promise((r) => setTimeout(r, 100));
  });

  it('GET /notifications returns only calling user\'s notifications', async () => {
    const memberRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications'))
      .set(auth(notifMemberToken));
    expect(memberRes.status).toBe(200);
    expect(memberRes.body.data.length).toBeGreaterThan(0);
    memberRes.body.data.forEach((n: { userId: string }) => {
      expect(n.userId).toBe(memberRes.body.data[0].userId);
    });

    // Admin should have no notifications (they created the task, not assigned)
    const adminRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications'))
      .set(auth(notifAdminToken));
    expect(adminRes.body.data.length).toBe(0);
  });

  it('?unreadOnly=true filters to unread', async () => {
    const listRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications'))
      .set(auth(notifMemberToken));
    const notifId = listRes.body.data[0].id;

    // Mark one as read
    await request(app)
      .put(tasksApi(notifHouseholdId, `/notifications/${notifId}/read`))
      .set(auth(notifMemberToken));

    const unreadRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications?unreadOnly=true'))
      .set(auth(notifMemberToken));
    const ids = unreadRes.body.data.map((n: { id: string }) => n.id);
    expect(ids).not.toContain(notifId);
  });

  it('PUT /notifications/:id/read marks own notification → 200, isRead: true', async () => {
    const listRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications'))
      .set(auth(notifMemberToken));
    const notifId = listRes.body.data[0].id;

    const res = await request(app)
      .put(tasksApi(notifHouseholdId, `/notifications/${notifId}/read`))
      .set(auth(notifMemberToken));
    expect(res.status).toBe(200);
    expect(res.body.data.isRead).toBe(true);
  });

  it('PUT /notifications/:id/read for another user\'s notification → 403', async () => {
    const listRes = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications'))
      .set(auth(notifMemberToken));
    const notifId = listRes.body.data[0].id;

    const res = await request(app)
      .put(tasksApi(notifHouseholdId, `/notifications/${notifId}/read`))
      .set(auth(notifAdminToken));
    expect(res.status).toBe(403);
  });

  it('PUT /notifications/read-all marks all unread → 200 with count', async () => {
    const res = await request(app)
      .put(tasksApi(notifHouseholdId, '/notifications/read-all'))
      .set(auth(notifMemberToken));
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBeGreaterThan(0);
  });

  it('after read-all, ?unreadOnly=true returns empty', async () => {
    await request(app)
      .put(tasksApi(notifHouseholdId, '/notifications/read-all'))
      .set(auth(notifMemberToken));

    const res = await request(app)
      .get(tasksApi(notifHouseholdId, '/notifications?unreadOnly=true'))
      .set(auth(notifMemberToken));
    expect(res.body.data).toHaveLength(0);
  });
});
