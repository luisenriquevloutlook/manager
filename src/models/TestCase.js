

const VALID_RESULTS = ['pending', 'passed', 'failed', 'blocked'];

/**
 * Creates a new TestCase object within a project.
 * @param {string} projectId - ID of the parent project.
 * @param {string} title - Test case title.
 * @param {string} description - Test case description.
 * @param {string[]} steps - Ordered list of execution steps.
 * @param {string} expectedResult - Expected outcome.
 * @returns {object} TestCase object.
 */
function createTestCase(projectId, title, description = '', steps = [], expectedResult = '') {
  return {
    id: crypto.randomUUID(),
    projectId,
    title,
    description,
    steps,
    expectedResult,
    result: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

module.exports = { createTestCase, VALID_RESULTS };
