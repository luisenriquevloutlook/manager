const { randomUUID } = require('crypto');


const VALID_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];
const VALID_PRIORITIES = ['low', 'medium', 'high'];

/**
 * Creates a new Task object within a project.
 * @param {string} projectId - ID of the parent project.
 * @param {string} title - Task title.
 * @param {string} description - Task description.
 * @param {string} priority - Task priority: 'low', 'medium', 'high'.
 * @returns {object} Task object.
 */
function createTask(projectId, title, description = '', priority = 'medium') {
  if (!VALID_PRIORITIES.includes(priority)) {
    throw new Error(`Invalid priority. Must be one of: ${VALID_PRIORITIES.join(', ')}`);
  }
  return {
    id: randomUUID(),
    projectId,
    title,
    description,
    status: 'pending',
    priority,
    assignedTo: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { createTask, VALID_STATUSES, VALID_PRIORITIES };
