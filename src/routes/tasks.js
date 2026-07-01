const express = require('express');
const router = express.Router({ mergeParams: true });
const { createTask, VALID_STATUSES, VALID_PRIORITIES } = require('../models/Task');
const store = require('../data/store');

// GET /api/projects/:projectId/tasks - list tasks for a project
router.get('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const tasks = store.tasks.filter((t) => t.projectId === projectId);
  res.json(tasks);
});

// GET /api/projects/:projectId/tasks/:id - get a single task
router.get('/:id', (req, res) => {
  const task = store.tasks.find(
    (t) => t.id === req.params.id && t.projectId === req.params.projectId
  );
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
});

// POST /api/projects/:projectId/tasks - create a task
router.post('/', (req, res) => {
  const { projectId } = req.params;
  const project = store.projects.find((p) => p.id === projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const { title, description, priority } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Task title is required' });
  }

  let task;
  try {
    task = createTask(projectId, title.trim(), description, priority);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
  store.tasks.push(task);
  res.status(201).json(task);
});

// PUT /api/projects/:projectId/tasks/:id - update a task
router.put('/:id', (req, res) => {
  const index = store.tasks.findIndex(
    (t) => t.id === req.params.id && t.projectId === req.params.projectId
  );
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assignedTo } = req.body;
  const task = store.tasks[index];

  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: 'Task title cannot be empty' });
    task.title = title.trim();
  }
  if (description !== undefined) task.description = description;
  if (status !== undefined) {
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }
    task.status = status;
  }
  if (priority !== undefined) {
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of: ${VALID_PRIORITIES.join(', ')}` });
    }
    task.priority = priority;
  }
  if (assignedTo !== undefined) task.assignedTo = assignedTo;
  task.updatedAt = new Date().toISOString();

  res.json(task);
});

// DELETE /api/projects/:projectId/tasks/:id - delete a task
router.delete('/:id', (req, res) => {
  const index = store.tasks.findIndex(
    (t) => t.id === req.params.id && t.projectId === req.params.projectId
  );
  if (index === -1) return res.status(404).json({ error: 'Task not found' });

  const project = store.projects.find((p) => p.id === req.params.projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const [removed] = store.tasks.splice(index, 1);
  res.json({ message: 'Task deleted', task: removed });
});

module.exports = router;
