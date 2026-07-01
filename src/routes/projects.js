const express = require('express');
const router = express.Router();
const { createProject } = require('../models/Project');
const store = require('../data/store');

// GET /api/projects - list all projects
router.get('/', (req, res) => {
  res.json(store.projects);
});

// GET /api/projects/:id - get a single project
router.get('/:id', (req, res) => {
  const project = store.projects.find((p) => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

// POST /api/projects - create a new project
router.post('/', (req, res) => {
  const { name, description } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  const project = createProject(name.trim(), description);
  store.projects.push(project);
  res.status(201).json(project);
});

// PUT /api/projects/:id - update a project
router.put('/:id', (req, res) => {
  const index = store.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });

  const { name, description, status } = req.body;
  const project = store.projects[index];

  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Project name cannot be empty' });
    project.name = name.trim();
  }
  if (description !== undefined) project.description = description;
  if (status !== undefined) {
    const valid = ['active', 'completed', 'archived'];
    if (!valid.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${valid.join(', ')}` });
    }
    project.status = status;
  }
  project.updatedAt = new Date().toISOString();

  res.json(project);
});

// DELETE /api/projects/:id - delete a project (and its tasks/test cases)
router.delete('/:id', (req, res) => {
  const index = store.projects.findIndex((p) => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Project not found' });

  const [removed] = store.projects.splice(index, 1);

  // Cascade delete tasks and test cases
  store.tasks = store.tasks.filter((t) => t.projectId !== removed.id);
  store.testCases = store.testCases.filter((tc) => tc.projectId !== removed.id);

  res.json({ message: 'Project deleted', project: removed });
});

module.exports = router;
