const { randomUUID } = require('crypto');


/**
 * Creates a new Project object.
 * @param {string} name - Project name.
 * @param {string} description - Project description.
 * @returns {object} Project object.
 */
function createProject(name, description = '') {
  return {
    id: randomUUID(),
    name,
    description,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { createProject };
