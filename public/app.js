// ── State ────────────────────────────────────────────────────────────────────
let projects = [];
let tasks = [];
let testCases = [];

// ── Utilities ─────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2500) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' });
}

function badge(value) {
  return `<span class="badge badge-${value}">${value}</span>`;
}

function priorityLabel(p) {
  return p === 'low' ? 'Baja' : p === 'medium' ? 'Media' : 'Alta';
}

function statusLabel(s) {
  const map = {
    active: 'Activo', completed: 'Completado', archived: 'Archivado',
    pending: 'Pendiente', in_progress: 'En progreso', cancelled: 'Cancelado',
    passed: 'Pasó', failed: 'Falló', blocked: 'Bloqueado',
  };
  return map[s] || s;
}

async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error');
  return data;
}

// ── Section navigation ────────────────────────────────────────────────────────
function showSection(name) {
  document.querySelectorAll('.section').forEach((s) => s.classList.remove('active'));
  document.querySelectorAll('nav button').forEach((b) => b.classList.remove('active'));
  document.getElementById(`section-${name}`).classList.add('active');
  document.getElementById(`nav-${name}`).classList.add('active');
  if (name === 'tasks') renderTasks();
  if (name === 'tests') renderTestCases();
}

// ── Projects ──────────────────────────────────────────────────────────────────
async function loadProjects() {
  projects = await api('GET', '/api/projects');
  renderProjects();
  populateProjectDropdowns();
}

function renderProjects() {
  const tbody = document.getElementById('tbody-projects');
  const empty = document.getElementById('empty-projects');
  if (!projects.length) { tbody.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  tbody.innerHTML = projects.map((p) => `
    <tr>
      <td><span class="project-link" onclick="filterByProject('${p.id}')">${p.name}</span></td>
      <td>${p.description || '—'}</td>
      <td>${badge(p.status)}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td class="actions">
        <button onclick="changeProjectStatus('${p.id}', '${p.status}')">Estado</button>
        <button class="danger" onclick="deleteProject('${p.id}')">Eliminar</button>
      </td>
    </tr>
  `).join('');
}

function populateProjectDropdowns() {
  ['task-project', 'tc-project'].forEach((id) => {
    const sel = document.getElementById(id);
    const current = sel.value;
    sel.innerHTML = projects.map((p) => `<option value="${p.id}">${p.name}</option>`).join('');
    if (current) sel.value = current;
  });
}

document.getElementById('form-project').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('proj-name').value.trim();
  const description = document.getElementById('proj-desc').value.trim();
  try {
    const p = await api('POST', '/api/projects', { name, description });
    projects.push(p);
    renderProjects();
    populateProjectDropdowns();
    e.target.reset();
    showToast(`Proyecto "${p.name}" creado`);
  } catch (err) { showToast(err.message); }
});

async function deleteProject(id) {
  if (!confirm('¿Eliminar este proyecto y todas sus tareas y casos de prueba?')) return;
  try {
    await api('DELETE', `/api/projects/${id}`);
    projects = projects.filter((p) => p.id !== id);
    tasks = tasks.filter((t) => t.projectId !== id);
    testCases = testCases.filter((tc) => tc.projectId !== id);
    renderProjects();
    renderTasks();
    renderTestCases();
    populateProjectDropdowns();
    showToast('Proyecto eliminado');
  } catch (err) { showToast(err.message); }
}

async function changeProjectStatus(id, current) {
  const options = ['active', 'completed', 'archived'].filter((s) => s !== current);
  const next = options[0];
  const label = statusLabel(next);
  if (!confirm(`¿Cambiar estado a "${label}"?`)) return;
  try {
    const updated = await api('PUT', `/api/projects/${id}`, { status: next });
    const idx = projects.findIndex((p) => p.id === id);
    if (idx !== -1) projects[idx] = updated;
    renderProjects();
    showToast(`Estado actualizado a "${label}"`);
  } catch (err) { showToast(err.message); }
}

function filterByProject(projectId) {
  const sel = document.getElementById('task-project');
  sel.value = projectId;
  showSection('tasks');
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
async function loadTasks() {
  const all = await Promise.all(projects.map((p) => api('GET', `/api/projects/${p.id}/tasks`)));
  tasks = all.flat();
  renderTasks();
}

function renderTasks() {
  const tbody = document.getElementById('tbody-tasks');
  const empty = document.getElementById('empty-tasks');
  if (!tasks.length) { tbody.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  tbody.innerHTML = tasks.map((t) => {
    const proj = projects.find((p) => p.id === t.projectId);
    return `
    <tr>
      <td>${t.title}</td>
      <td>${proj ? proj.name : '—'}</td>
      <td>${badge(t.priority)}</td>
      <td>
        <select onchange="updateTaskStatus('${t.id}', '${t.projectId}', this.value)" style="font-size:0.8rem;padding:2px;">
          ${['pending','in_progress','completed','cancelled'].map((s) =>
            `<option value="${s}" ${t.status === s ? 'selected' : ''}>${statusLabel(s)}</option>`
          ).join('')}
        </select>
      </td>
      <td>${t.assignedTo || '—'}</td>
      <td class="actions">
        <button class="danger" onclick="deleteTask('${t.id}', '${t.projectId}')">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('form-task').addEventListener('submit', async (e) => {
  e.preventDefault();
  const projectId = document.getElementById('task-project').value;
  const title = document.getElementById('task-title').value.trim();
  const description = document.getElementById('task-desc').value.trim();
  const priority = document.getElementById('task-priority').value;
  const assignedTo = document.getElementById('task-assigned').value.trim() || null;
  if (!projectId) { showToast('Selecciona un proyecto'); return; }
  try {
    const t = await api('POST', `/api/projects/${projectId}/tasks`, { title, description, priority });
    if (assignedTo) {
      const updated = await api('PUT', `/api/projects/${projectId}/tasks/${t.id}`, { assignedTo });
      tasks.push(updated);
    } else {
      tasks.push(t);
    }
    renderTasks();
    e.target.reset();
    showToast(`Tarea "${t.title}" creada`);
  } catch (err) { showToast(err.message); }
});

async function updateTaskStatus(taskId, projectId, status) {
  try {
    const updated = await api('PUT', `/api/projects/${projectId}/tasks/${taskId}`, { status });
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx !== -1) tasks[idx] = updated;
    showToast(`Estado actualizado`);
  } catch (err) { showToast(err.message); }
}

async function deleteTask(taskId, projectId) {
  if (!confirm('¿Eliminar esta tarea?')) return;
  try {
    await api('DELETE', `/api/projects/${projectId}/tasks/${taskId}`);
    tasks = tasks.filter((t) => t.id !== taskId);
    renderTasks();
    showToast('Tarea eliminada');
  } catch (err) { showToast(err.message); }
}

// ── Test Cases ────────────────────────────────────────────────────────────────
async function loadTestCases() {
  const all = await Promise.all(projects.map((p) => api('GET', `/api/projects/${p.id}/test-cases`)));
  testCases = all.flat();
  renderTestCases();
}

function renderTestCases() {
  const tbody = document.getElementById('tbody-tests');
  const empty = document.getElementById('empty-tests');
  if (!testCases.length) { tbody.innerHTML = ''; empty.style.display = ''; return; }
  empty.style.display = 'none';
  tbody.innerHTML = testCases.map((tc) => {
    const proj = projects.find((p) => p.id === tc.projectId);
    return `
    <tr>
      <td>
        <strong>${tc.title}</strong>
        ${tc.steps && tc.steps.length ? `<br><small style="color:#888">${tc.steps.length} paso(s)</small>` : ''}
      </td>
      <td>${proj ? proj.name : '—'}</td>
      <td style="max-width:200px;font-size:0.82rem">${tc.expectedResult || '—'}</td>
      <td>
        <select onchange="updateTestCaseResult('${tc.id}', '${tc.projectId}', this.value)" style="font-size:0.8rem;padding:2px;">
          ${['pending','passed','failed','blocked'].map((r) =>
            `<option value="${r}" ${tc.result === r ? 'selected' : ''}>${statusLabel(r)}</option>`
          ).join('')}
        </select>
      </td>
      <td class="actions">
        <button class="danger" onclick="deleteTestCase('${tc.id}', '${tc.projectId}')">Eliminar</button>
      </td>
    </tr>`;
  }).join('');
}

document.getElementById('form-testcase').addEventListener('submit', async (e) => {
  e.preventDefault();
  const projectId = document.getElementById('tc-project').value;
  const title = document.getElementById('tc-title').value.trim();
  const description = document.getElementById('tc-desc').value.trim();
  const stepsRaw = document.getElementById('tc-steps').value;
  const steps = stepsRaw.split('\n').map((s) => s.trim()).filter(Boolean);
  const expectedResult = document.getElementById('tc-expected').value.trim();
  if (!projectId) { showToast('Selecciona un proyecto'); return; }
  try {
    const tc = await api('POST', `/api/projects/${projectId}/test-cases`, { title, description, steps, expectedResult });
    testCases.push(tc);
    renderTestCases();
    e.target.reset();
    showToast(`Caso de prueba "${tc.title}" creado`);
  } catch (err) { showToast(err.message); }
});

async function updateTestCaseResult(tcId, projectId, result) {
  try {
    const updated = await api('PUT', `/api/projects/${projectId}/test-cases/${tcId}`, { result });
    const idx = testCases.findIndex((tc) => tc.id === tcId);
    if (idx !== -1) testCases[idx] = updated;
    showToast('Resultado actualizado');
  } catch (err) { showToast(err.message); }
}

async function deleteTestCase(tcId, projectId) {
  if (!confirm('¿Eliminar este caso de prueba?')) return;
  try {
    await api('DELETE', `/api/projects/${projectId}/test-cases/${tcId}`);
    testCases = testCases.filter((tc) => tc.id !== tcId);
    renderTestCases();
    showToast('Caso de prueba eliminado');
  } catch (err) { showToast(err.message); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
(async () => {
  await loadProjects();
  await loadTasks();
  await loadTestCases();
})();
