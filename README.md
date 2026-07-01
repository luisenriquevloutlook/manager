# Manager — Administración de Trabajo

Aplicación web para la administración de proyectos de trabajo con módulos de **ProjectManager** y **TestManager**.

## Características

### 📁 ProjectManager
- Crear, editar y eliminar proyectos.
- Gestionar tareas dentro de cada proyecto (título, descripción, prioridad, estado, asignación).
- Estado de proyecto: activo, completado, archivado.

### 🧪 TestManager
- Crear y gestionar casos de prueba por proyecto.
- Definir pasos de ejecución y resultado esperado.
- Registrar el resultado de cada caso: pendiente, pasó, falló, bloqueado.

## Tecnología

- **Backend**: Node.js + Express 5
- **Frontend**: HTML/CSS/JavaScript (Vanilla)
- **Tests**: Jest + Supertest

## Instalación

```bash
npm install
```

## Uso

```bash
# Iniciar el servidor (http://localhost:3000)
npm start

# Ejecutar los tests
npm test
```

## API REST

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/projects` | Listar proyectos |
| POST | `/api/projects` | Crear proyecto |
| PUT | `/api/projects/:id` | Actualizar proyecto |
| DELETE | `/api/projects/:id` | Eliminar proyecto (cascada) |
| GET | `/api/projects/:pid/tasks` | Listar tareas del proyecto |
| POST | `/api/projects/:pid/tasks` | Crear tarea |
| PUT | `/api/projects/:pid/tasks/:id` | Actualizar tarea |
| DELETE | `/api/projects/:pid/tasks/:id` | Eliminar tarea |
| GET | `/api/projects/:pid/test-cases` | Listar casos de prueba |
| POST | `/api/projects/:pid/test-cases` | Crear caso de prueba |
| PUT | `/api/projects/:pid/test-cases/:id` | Actualizar caso de prueba |
| DELETE | `/api/projects/:pid/test-cases/:id` | Eliminar caso de prueba |
