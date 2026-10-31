import { afterEach, describe, expect, test, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App.jsx';

function mockFetch(body, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('shows a loading message until the tasks arrive', async () => {
    mockFetch([]);

    render(<App />);

    expect(screen.getByText('Yükleniyor...')).toBeTruthy();
    await screen.findByText('Henüz görev yok.');
  });

  test('lists the tasks returned by the API', async () => {
    const fetchMock = mockFetch([
      {
        id: 1,
        title: 'Read for 20 minutes',
        description: 'Read one chapter of a book.',
        developmentArea: 'Language',
        dueDate: '2026-11-02',
        status: 'pending',
      },
      {
        id: 2,
        title: 'Practice counting to 50',
        description: 'Count objects at home out loud.',
        developmentArea: 'Cognitive',
        dueDate: '2026-11-03',
        status: 'done',
      },
    ]);

    render(<App />);

    expect(await screen.findByText('Read for 20 minutes')).toBeTruthy();
    expect(screen.getByText('Read one chapter of a book.')).toBeTruthy();
    expect(screen.getByText('Language')).toBeTruthy();
    expect(screen.getByText('2026-11-02')).toBeTruthy();
    expect(screen.getByText('Bekliyor')).toBeTruthy();
    expect(screen.getByText('Tamamlandı')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks');
  });

  test('shows a message when there are no tasks', async () => {
    mockFetch([]);

    render(<App />);

    expect(await screen.findByText('Henüz görev yok.')).toBeTruthy();
  });

  test('shows an error when the API responds with an error', async () => {
    mockFetch({}, false, 500);

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Görevler yüklenemedi.'
    );
  });

  test('shows an error when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network error')));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Görevler yüklenemedi.'
    );
  });
});
