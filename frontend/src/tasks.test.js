import { describe, expect, it } from 'vitest';
import { groupByStatus, neighbourStatus } from './tasks.js';

describe('groupByStatus', () => {
  it('mengelompokkan tugas ke kolom sesuai status', () => {
    const tasks = [
      { id: 1, status: 'todo' },
      { id: 2, status: 'done' },
      { id: 3, status: 'todo' },
    ];
    const grouped = groupByStatus(tasks);
    expect(grouped.todo.map((task) => task.id)).toEqual([1, 3]);
    expect(grouped.in_progress).toEqual([]);
    expect(grouped.done.map((task) => task.id)).toEqual([2]);
  });
});

describe('neighbourStatus', () => {
  it('mengembalikan kolom sebelum dan sesudahnya', () => {
    expect(neighbourStatus('in_progress', -1)).toBe('todo');
    expect(neighbourStatus('in_progress', 1)).toBe('done');
  });

  it('mengembalikan null di ujung papan', () => {
    expect(neighbourStatus('todo', -1)).toBeNull();
    expect(neighbourStatus('done', 1)).toBeNull();
  });
});
