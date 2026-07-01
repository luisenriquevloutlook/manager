const express = require('express');
const path = require('path');

const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const testCasesRouter = require('./routes/testCases');

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/tasks', tasksRouter);
app.use('/api/projects/:projectId/test-cases', testCasesRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

module.exports = app;
