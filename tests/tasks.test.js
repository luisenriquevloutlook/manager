const request = require('supertest');

let app;
let store;
let projectId;

beforeEach(async () => {
  jest.resetModules();
  store = require('../src/data/store');
  store.projects = [];
  store.tasks = [];
  store.testCases = [];
  app = require('../src/app');
  // Create a project to use in task tests
  const res = await request(app).post('/api/projects').send({ name: 'Test Project' });
  projectId = res.body.id;
});

describe('Tasks API', () => {
  it('GET /api/projects/:pid/tasks returns empty array', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/tasks`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates a task with defaults', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'Task One' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Task One');
    expect(res.body.status).toBe('pending');
    expect(res.body.priority).toBe('medium');
    expect(res.body.projectId).toBe(projectId);
  });

  it('POST creates a task with custom priority', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'High Task', priority: 'high' });
    expect(res.status).toBe(201);
    expect(res.body.priority).toBe('high');
  });

  it('POST rejects missing title', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('POST rejects invalid priority', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'T', priority: 'critical' });
    expect(res.status).toBe(400);
  });

  it('POST returns 404 for unknown project', async () => {
    const res = await request(app)
      .post('/api/projects/unknown/tasks')
      .send({ title: 'T' });
    expect(res.status).toBe(404);
  });

  it('PUT updates task status and priority', async () => {
    const { body: task } = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'T' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/tasks/${task.id}`)
      .send({ status: 'in_progress', priority: 'high', assignedTo: 'Ana' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.priority).toBe('high');
    expect(res.body.assignedTo).toBe('Ana');
  });

  it('PUT rejects invalid status', async () => {
    const { body: task } = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'T' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/tasks/${task.id}`)
      .send({ status: 'unknown' });
    expect(res.status).toBe(400);
  });

  it('DELETE removes the task', async () => {
    const { body: task } = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'ToDelete' });
    const res = await request(app).delete(`/api/projects/${projectId}/tasks/${task.id}`);
    expect(res.status).toBe(200);
    const list = await request(app).get(`/api/projects/${projectId}/tasks`);
    expect(list.body).toHaveLength(0);
  });

  it('GET single task returns correct task', async () => {
    const { body: task } = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .send({ title: 'Single' });
    const res = await request(app).get(`/api/projects/${projectId}/tasks/${task.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Single');
  });

  it('GET single task returns 404 for unknown id', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/tasks/nope`);
    expect(res.status).toBe(404);
  });
});
