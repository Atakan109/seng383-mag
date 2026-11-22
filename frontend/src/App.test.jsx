import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App.jsx';

const parentLogin = {
  token: 'parent-token',
  user: { id: 1, name: 'Demo Parent', email: 'parent@mag.test', role: 'parent' },
};

// Answers fetch calls by URL, like the backend would.
function mockApi({ login = { status: 200, body: parentLogin }, children = { status: 200, body: [] } } = {}) {
  const fetchMock = vi.fn((url) => {
    const answer = url === '/api/auth/login' ? login : children;
    return Promise.resolve({
      ok: answer.status >= 200 && answer.status < 300,
      status: answer.status,
      json: () => Promise.resolve(answer.body),
    });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function fillAndSubmit(email, password) {
  fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: password } });
  fireEvent.click(screen.getByRole('button', { name: 'Giriş yap' }));
}

function saveLogin(session) {
  localStorage.setItem('mag-session', JSON.stringify(session));
}

describe('Login and role-based home', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('shows the login page when nobody is logged in', () => {
    mockApi();

    render(<App />);

    expect(screen.getByRole('heading', { name: 'Giriş yap' })).toBeTruthy();
  });

  test('logs in, sends email and password, and shows the parent home page', async () => {
    const fetchMock = mockApi({ children: { status: 200, body: [{ id: 3, name: 'Demo Child' }] } });

    render(<App />);
    fillAndSubmit(' parent@mag.test ', 'secret');

    expect(await screen.findByText('Merhaba, Demo Parent (Veli)')).toBeTruthy();
    expect(await screen.findByText('Demo Child')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Çocuklarım' })).toBeTruthy();
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      email: 'parent@mag.test',
      password: 'secret',
    });
  });

  test('sends the token when loading the children', async () => {
    const fetchMock = mockApi();

    render(<App />);
    fillAndSubmit('parent@mag.test', 'secret');

    await screen.findByText('Henüz çocuk yok.');
    expect(fetchMock).toHaveBeenCalledWith('/api/children', {
      headers: { Authorization: 'Bearer parent-token' },
    });
  });

  test('shows an error and stays on the login page with a wrong password (FR-M1-02)', async () => {
    mockApi({ login: { status: 401, body: { error: 'Wrong email or password' } } });

    render(<App />);
    fillAndSubmit('parent@mag.test', 'wrong');

    expect((await screen.findByRole('alert')).textContent).toBe('E-posta veya şifre hatalı.');
    expect(screen.getByRole('heading', { name: 'Giriş yap' })).toBeTruthy();
  });

  test('shows an error when the server cannot be reached', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));

    render(<App />);
    fillAndSubmit('parent@mag.test', 'secret');

    expect((await screen.findByRole('alert')).textContent).toBe('Sunucuya bağlanılamadı.');
  });

  test('keeps the user logged in after a page refresh', async () => {
    mockApi();
    saveLogin(parentLogin);

    render(<App />);

    expect(await screen.findByText('Merhaba, Demo Parent (Veli)')).toBeTruthy();
  });

  test('logs out and goes back to the login page (FR-M1-06)', async () => {
    mockApi();
    saveLogin(parentLogin);

    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Çıkış yap' }));

    expect(screen.getByRole('heading', { name: 'Giriş yap' })).toBeTruthy();
    expect(localStorage.getItem('mag-session')).toBeNull();
  });

  test('goes back to the login page when the token is no longer valid', async () => {
    mockApi({ children: { status: 401, body: { error: 'Invalid or expired token' } } });
    saveLogin(parentLogin);

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Giriş yap' })).toBeTruthy();
  });

  test('a specialist sees the linked children with the specialist type (FR-M1-05)', async () => {
    mockApi({
      children: { status: 200, body: [{ id: 3, name: 'Demo Child', specialistType: 'Speech therapist' }] },
    });
    saveLogin({ token: 't', user: { id: 2, name: 'Demo Specialist', role: 'specialist' } });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Bağlı olduğum çocuklar' })).toBeTruthy();
    expect(screen.getByText('Demo Child – Speech therapist')).toBeTruthy();
  });

  test('a child sees the child home page, not a list of children (FR-M1-05)', async () => {
    mockApi({ children: { status: 200, body: [{ id: 3, name: 'Demo Child' }] } });
    saveLogin({ token: 't', user: { id: 3, name: 'Demo Child', role: 'child' } });

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Hoş geldin!' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Çocuklarım' })).toBeNull();
  });

  test('shows an error when the children cannot be loaded', async () => {
    mockApi({ children: { status: 500, body: {} } });
    saveLogin(parentLogin);

    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toBe('Bilgiler yüklenemedi.');
  });
});
