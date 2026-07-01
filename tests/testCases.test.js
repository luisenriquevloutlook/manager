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
  const res = await request(app).post('/api/projects').send({ name: 'QA Project' });
  projectId = res.body.id;
});

describe('TestCases API', () => {
  it('GET /api/projects/:pid/test-cases returns empty array', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/test-cases`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('POST creates a test case with defaults', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'Login Test' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Login Test');
    expect(res.body.result).toBe('pending');
    expect(res.body.steps).toEqual([]);
    expect(res.body.projectId).toBe(projectId);
  });

  it('POST creates a test case with steps and expected result', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({
        title: 'Checkout',
        steps: ['Open cart', 'Click checkout', 'Fill payment'],
        expectedResult: 'Order confirmed',
      });
    expect(res.status).toBe(201);
    expect(res.body.steps).toHaveLength(3);
    expect(res.body.expectedResult).toBe('Order confirmed');
  });

  it('POST rejects missing title', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ description: 'no title' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  it('POST returns 404 for unknown project', async () => {
    const res = await request(app)
      .post('/api/projects/unknown/test-cases')
      .send({ title: 'T' });
    expect(res.status).toBe(404);
  });

  it('GET single test case returns correct data', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'Registration' });
    const res = await request(app).get(`/api/projects/${projectId}/test-cases/${tc.id}`);
    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Registration');
  });

  it('GET single test case returns 404 for unknown id', async () => {
    const res = await request(app).get(`/api/projects/${projectId}/test-cases/nope`);
    expect(res.status).toBe(404);
  });

  it('PUT updates result', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'Smoke Test' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/test-cases/${tc.id}`)
      .send({ result: 'passed' });
    expect(res.status).toBe(200);
    expect(res.body.result).toBe('passed');
  });

  it('PUT updates steps', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'T' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/test-cases/${tc.id}`)
      .send({ steps: ['Step A', 'Step B'] });
    expect(res.status).toBe(200);
    expect(res.body.steps).toEqual(['Step A', 'Step B']);
  });

  it('PUT rejects invalid result', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'T' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/test-cases/${tc.id}`)
      .send({ result: 'unknown_result' });
    expect(res.status).toBe(400);
  });

  it('PUT rejects non-array steps', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'T' });
    const res = await request(app)
      .put(`/api/projects/${projectId}/test-cases/${tc.id}`)
      .send({ steps: 'not an array' });
    expect(res.status).toBe(400);
  });

  it('DELETE removes the test case', async () => {
    const { body: tc } = await request(app)
      .post(`/api/projects/${projectId}/test-cases`)
      .send({ title: 'ToDelete' });
    const res = await request(app).delete(`/api/projects/${projectId}/test-cases/${tc.id}`);
    expect(res.status).toBe(200);
    const list = await request(app).get(`/api/projects/${projectId}/test-cases`);
    expect(list.body).toHaveLength(0);
  });
});
