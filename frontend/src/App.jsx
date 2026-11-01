import { useEffect, useState } from 'react';
import { createTask, deleteTask, getHealth, getTasks, updateTask } from './api.js';
import { COLUMNS, groupByStatus, neighbourStatus } from './tasks.js';

function TaskCard({ task, onMove, onDelete }) {
  const previous = neighbourStatus(task.status, -1);
  const next = neighbourStatus(task.status, 1);

  return (
    <li className="card">
      <h3>{task.title}</h3>
      {task.description && <p>{task.description}</p>}
      <div className="card-actions">
        <button
          type="button"
          disabled={!previous}
          aria-label={`Pindahkan ${task.title} ke kolom sebelumnya`}
          onClick={() => onMove(task.id, previous)}
        >
          ←
        </button>
        <button
          type="button"
          disabled={!next}
          aria-label={`Pindahkan ${task.title} ke kolom berikutnya`}
          onClick={() => onMove(task.id, next)}
        >
          →
        </button>
        <button type="button" className="danger" onClick={() => onDelete(task.id)}>
          Hapus
        </button>
      </div>
    </li>
  );
}

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState('');

  const run = async (action) => {
    setError('');
    try {
      await action();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  useEffect(() => {
    run(async () => setTasks(await getTasks())).finally(() => setLoading(false));
    getHealth()
      .then((health) => setVersion(health.version))
      .catch(() => {});
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const added = await run(async () => {
      const task = await createTask({ title, description });
      setTasks((current) => [task, ...current]);
    });
    if (added) {
      setTitle('');
      setDescription('');
    }
  };

  const handleMove = (id, status) =>
    run(async () => {
      const updated = await updateTask(id, { status });
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    });

  const handleDelete = (id) =>
    run(async () => {
      await deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
    });

  const grouped = groupByStatus(tasks);

  return (
    <div className="page">
      <header>
        <h1>TaskFlow</h1>
        <p>Papan tugas tim, dari rencana sampai selesai.</p>
      </header>

      <form className="task-form" onSubmit={handleSubmit}>
        <label>
          Judul tugas
          <input
            value={title}
            maxLength={200}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Deskripsi (opsional)
          <input value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <button type="submit">Tambah tugas</button>
      </form>

      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <main className="board">
        {COLUMNS.map(({ status, label }) => (
          <section className="column" key={status} aria-label={label}>
            <h2>
              {label} <span className="count">{grouped[status].length}</span>
            </h2>
            {grouped[status].length === 0 ? (
              <p className="empty">{loading ? 'Memuat...' : 'Belum ada tugas'}</p>
            ) : (
              <ul>
                {grouped[status].map((task) => (
                  <TaskCard key={task.id} task={task} onMove={handleMove} onDelete={handleDelete} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </main>

      <footer>Versi deploy: {version || '-'}</footer>
    </div>
  );
}
