import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import ChildTasksPage from './ChildTasksPage.jsx';

const TOKEN = 'test-token';
const CHILD_ID = 7;

const pendingTask = {
  id: 1,
  childId: CHILD_ID,
  title: 'Read for 20 minutes',
  description: 'Read one chapter of a book.',
  developmentArea: 'Language',
  dueDate: '2026-11-02',
  status: 'pending',
  assignedBy: { id: 1, name: 'Demo Parent' },
};

const doneTask = {
  ...pendingTask,
  id: 2,
  title: 'Practice counting to 50',
  description: 'Count objects at home out loud.',
  developmentArea: 'Cognitive',
  dueDate: '2026-11-03',
  status: 'done',
};

function jsonResponse(body, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

// Fake backend: answers GET with the given tasks and PATCH with the result of onPatch.
function mockApi({ tasks = [pendingTask, doneTask], getStatus = 200, onPatch } = {}) {
  const fetchMock = vi.fn((url, options = {}) => {
    if ((options.method || 'GET') === 'GET') {
      return getStatus === 200 ? jsonResponse(tasks) : jsonResponse({ error: 'x' }, getStatus);
    }
    return onPatch(url, options);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function renderPage() {
  return render(<ChildTasksPage token={TOKEN} childId={CHILD_ID} />);
}

describe('ChildTasksPage', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('loads the child\'s tasks with the login token', async () => {
    const fetchMock = mockApi();

    renderPage();

    expect(screen.getByText('Yükleniyor...')).toBeTruthy();
    expect(await screen.findByText('Read for 20 minutes')).toBeTruthy();
    expect(screen.getByText('Practice counting to 50')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('2026-11-02')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(`/api/children/${CHILD_ID}/tasks`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${TOKEN}` },
      body: undefined,
    });
  });

  test('shows a mark-as-done button only for pending tasks', async () => {
    mockApi();

    renderPage();

    const pendingRow = (await screen.findByText('Read for 20 minutes')).closest('tr');
    const doneRow = screen.getByText('Practice counting to 50').closest('tr');
    expect(within(pendingRow).getByText('Bekliyor', { exact: false })).toBeTruthy();
    expect(within(pendingRow).getByRole('button')).toBeTruthy();
    expect(within(doneRow).getByText('Tamamlandı')).toBeTruthy();
    expect(within(doneRow).queryByRole('button')).toBeNull();
  });

  test('marks a task as done (FR-M4-04)', async () => {
    const fetchMock = mockApi({
      onPatch: () => jsonResponse({ ...pendingTask, status: 'done' }),
    });

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Read for 20 minutes görevini tamamlandı olarak işaretle',
      })
    );

    const row = screen.getByText('Read for 20 minutes').closest('tr');
    await within(row).findByText('Tamamlandı');
    expect(within(row).queryByRole('button')).toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(`/api/children/${CHILD_ID}/tasks/1`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
  });

  test('disables the buttons while a task is being saved', async () => {
    let finishPatch;
    mockApi({
      tasks: [pendingTask, { ...pendingTask, id: 3, title: 'Second task' }],
      onPatch: () =>
        new Promise((resolve) => {
          finishPatch = () => resolve(jsonResponse({ ...pendingTask, status: 'done' }));
        }),
    });

    renderPage();
    const firstButton = await screen.findByRole('button', {
      name: 'Read for 20 minutes görevini tamamlandı olarak işaretle',
    });
    fireEvent.click(firstButton);

    expect(await screen.findByText('Kaydediliyor...')).toBeTruthy();
    expect(screen.getAllByRole('button').every((button) => button.disabled)).toBe(true);

    finishPatch();
    await screen.findByRole('button', { name: 'Second task görevini tamamlandı olarak işaretle' });
  });

  test('keeps the task pending and shows an error when saving fails', async () => {
    mockApi({ onPatch: () => jsonResponse({ error: 'Server error' }, 500) });

    renderPage();
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Read for 20 minutes görevini tamamlandı olarak işaretle',
      })
    );

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Görev güncellenemedi. Lütfen tekrar dene.'
    );
    const row = screen.getByText('Read for 20 minutes').closest('tr');
    expect(within(row).getByRole('button')).toBeTruthy();
  });

  test('shows a message when the child has no tasks', async () => {
    mockApi({ tasks: [] });

    renderPage();

    expect(await screen.findByText('Henüz görevin yok.')).toBeTruthy();
  });

  test.each([
    [401, 'Oturumun sona erdi. Lütfen yeniden giriş yap.'],
    [403, 'Bu çocuğun görevlerine erişim iznin yok.'],
    [500, 'Görevler yüklenemedi.'],
  ])('shows a clear message when loading fails with %i', async (status, message) => {
    mockApi({ getStatus: status });

    renderPage();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', message);
  });

  test('shows an error when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    renderPage();

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Görevler yüklenemedi.');
  });
});
