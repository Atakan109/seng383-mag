import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import AssignedTasksPage from './AssignedTasksPage.jsx';

const TOKEN = 'test-token';
const CHILD_ID = 7;
const ME = 2;

const myPendingTask = {
  id: 1,
  title: 'Practice counting to 50',
  developmentArea: 'Cognitive',
  dueDate: '2026-11-03',
  status: 'pending',
  assignedBy: { id: ME, name: 'Demo Specialist' },
};
const myDoneTask = {
  id: 2,
  title: 'Name five colours',
  developmentArea: 'Language',
  dueDate: '2026-11-05',
  status: 'done',
  assignedBy: { id: ME, name: 'Demo Specialist' },
};
const parentTask = {
  id: 3,
  title: 'Read for 20 minutes',
  developmentArea: 'Language',
  dueDate: '2026-11-02',
  status: 'pending',
  assignedBy: { id: 1, name: 'Demo Parent' },
};

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function renderPage() {
  return render(<AssignedTasksPage token={TOKEN} childId={CHILD_ID} userId={ME} />);
}

describe('AssignedTasksPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('lists only the tasks the user assigned, with their status (FR-M4-05)', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse([myPendingTask, myDoneTask, parentTask])));

    renderPage();

    const pendingRow = (await screen.findByText('Practice counting to 50')).closest('tr');
    const doneRow = screen.getByText('Name five colours').closest('tr');
    expect(within(pendingRow).getByText('Bekliyor')).toBeTruthy();
    expect(within(doneRow).getByText('Tamamlandı')).toBeTruthy();
    expect(screen.queryByText('Read for 20 minutes')).toBeNull();
  });

  test('shows a message when the user has not assigned any task yet', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse([parentTask])));

    renderPage();

    expect(await screen.findByText('Henüz görev atamadın.')).toBeTruthy();
  });

  test('adds a newly assigned task to the list', async () => {
    const newTask = {
      id: 9,
      title: 'Draw a family picture',
      developmentArea: 'Motor',
      dueDate: '2026-11-27',
      status: 'pending',
      assignedBy: { id: ME, name: 'Demo Specialist' },
    };
    vi.stubGlobal(
      'fetch',
      vi.fn((url, options = {}) =>
        options.method === 'POST' ? jsonResponse(newTask, 201) : jsonResponse([])
      )
    );

    renderPage();
    await screen.findByText('Henüz görev atamadın.');
    fireEvent.change(screen.getByLabelText('Başlık'), { target: { value: newTask.title } });
    fireEvent.change(screen.getByLabelText('Gelişim alanı'), { target: { value: 'Motor' } });
    fireEvent.change(screen.getByLabelText('Bitiş tarihi'), { target: { value: '2026-11-27' } });
    fireEvent.click(screen.getByRole('button', { name: 'Görevi ata' }));

    const row = (await screen.findByText('Draw a family picture')).closest('tr');
    expect(within(row).getByText('Bekliyor')).toBeTruthy();
    expect(screen.queryByText('Henüz görev atamadın.')).toBeNull();
  });

  test('shows an error when the tasks cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ error: 'No access' }, 403)));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Bu çocuğun görevlerine erişim iznin yok.'
    );
  });
});
