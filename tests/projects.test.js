const request = require('supertest');

// Fresh app + store for each test file
let app;
let store;

beforeEach(() => {
  jest.resetModules();
  store = require('../src/data/store');
  store.projects = [];
  store.tasks = [];
  store.testCases = [];
  app = require('../src/app');
});

describe('Projects API', () => {
  it('GET /api/projects returns empty array initially', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST /api/projects creates a project', async () => {
    const res = await request(app)
      .post('/api/projects')
      .send({ name: 'Alpha Project', description: 'Test desc' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Alpha Project');
    expect(res.body.description).toBe('Test desc');
    expect(res.body.status).toBe('active');
    expect(res.body.id).toBeDefined();
  });

  it('POST /api/projects rejects missing name', async () => {
    const res = await request(app).post('/api/projects').send({ description: 'no name' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/name/i);
  });

  it('POST /api/projects rejects blank name', async () => {
    const res = await request(app).post('/api/projects').send({ name: '   ' });
    expect(res.status).toBe(400);
  });

  it('GET /api/projects/:id returns the project', async () => {
    const created = await request(app)
      .post('/api/projects')
      .send({ name: 'Beta' });
    const res = await request(app).get(`/api/projects/${created.body.id}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Beta');
  });

  it('GET /api/projects/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/projects/nonexistent');
    expect(res.status).toBe(404);
  });

  it('PUT /api/projects/:id updates project fields', async () => {
    const { body: proj } = await request(app).post('/api/projects').send({ name: 'Old' });
    const res = await request(app)
      .put(`/api/projects/${proj.id}`)
      .send({ name: 'New Name', status: 'completed' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(res.body.status).toBe('completed');
  });

  it('PUT /api/projects/:id rejects invalid status', async () => {
    const { body: proj } = await request(app).post('/api/projects').send({ name: 'P' });
    const res = await request(app)
      .put(`/api/projects/${proj.id}`)
      .send({ status: 'invalid_status' });
    expect(res.status).toBe(400);
  });

  it('DELETE /api/projects/:id removes the project', async () => {
    const { body: proj } = await request(app).post('/api/projects').send({ name: 'ToDelete' });
    const res = await request(app).delete(`/api/projects/${proj.id}`);
    expect(res.status).toBe(200);
    const list = await request(app).get('/api/projects');
    expect(list.body).toHaveLength(0);
  });

  it('DELETE /api/projects/:id cascades to tasks and test cases', async () => {
    const { body: proj } = await request(app).post('/api/projects').send({ name: 'P' });
    await request(app).post(`/api/projects/${proj.id}/tasks`).send({ title: 'T1' });
    await request(app)
      .post(`/api/projects/${proj.id}/test-cases`)
      .send({ title: 'TC1' });
    await request(app).delete(`/api/projects/${proj.id}`);
    expect(store.tasks).toHaveLength(0);
    expect(store.testCases).toHaveLength(0);
  });
});
