export const COLUMNS = [
  { status: 'todo', label: 'Belum Dikerjakan' },
  { status: 'in_progress', label: 'Sedang Dikerjakan' },
  { status: 'done', label: 'Selesai' },
];

export const groupByStatus = (tasks) =>
  Object.fromEntries(
    COLUMNS.map(({ status }) => [status, tasks.filter((task) => task.status === status)]),
  );

// Status tetangga pada papan; null berarti tugas sudah berada di kolom paling ujung.
export const neighbourStatus = (status, direction) =>
  COLUMNS[COLUMNS.findIndex((column) => column.status === status) + direction]?.status ?? null;
