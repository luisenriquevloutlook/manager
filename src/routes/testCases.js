const express = require('express');
const router = express.Router({ mergeParams: true });
const { createTestCase, VALID_RESULTS } = require('../models/TestCase');
const store = require('../data/store');

// GET /api/projects/:projectId/test-cases - list test cases for a project
router.get('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const testCases = store.testCases.filter((tc) => tc.projectId === projectId);
  res.json(testCases);
});

// GET /api/projects/:projectId/test-cases/:id - get a single test case
router.get('/:id', (req, res) => {
  const testCase = store.testCases.find(
    (tc) => tc.id === req.params.id && tc.projectId === req.params.projectId
  );
  if (!testCase) return res.status(404).json({ error: 'Test case not found' });
  res.json(testCase);
});

// POST /api/projects/:projectId/test-cases - create a test case
router.post('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, description, steps, expectedResult } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Test case title is required' });
  }

  const testCase = createTestCase(projectId, title.trim(), description, steps, expectedResult);
  store.testCases.push(testCase);
  res.status(201).json(testCase);
});

// PUT /api/projects/:projectId/test-cases/:id - update a test case
router.put('/:id', (req, res) => {
  const index = store.testCases.findIndex(
    (tc) => tc.id === req.params.id && tc.projectId === req.params.projectId
  );
  if (index === -1) return res.status(404).json({ error: 'Test case not found' });

  const { title, description, steps, expectedResult, result } = req.body;
  const testCase = store.testCases[index];

  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: 'Test case title cannot be empty' });
    testCase.title = title.trim();
  }
  if (description !== undefined) testCase.description = description;
  if (steps !== undefined) {
    if (!Array.isArray(steps)) {
      return res.status(400).json({ error: 'Steps must be an array' });
    }
    testCase.steps = steps;
  }
  if (expectedResult !== undefined) testCase.expectedResult = expectedResult;
  if (result !== undefined) {
    if (!VALID_RESULTS.includes(result)) {
      return res.status(400).json({ error: `Result must be one of: ${VALID_RESULTS.join(', ')}` });
    }
    testCase.result = result;
  }
  testCase.updatedAt = new Date().toISOString();

  res.json(testCase);
});

// DELETE /api/projects/:projectId/test-cases/:id - delete a test case
router.delete('/:id', (req, res) => {
  const index = store.testCases.findIndex(
    (tc) => tc.id === req.params.id && tc.projectId === req.params.projectId
  );
  if (index === -1) return res.status(404).json({ error: 'Test case not found' });

  const project = store.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const [removed] = store.testCases.splice(index, 1);
  res.json({ message: 'Test case deleted', testCase: removed });
});

module.exports = router;
