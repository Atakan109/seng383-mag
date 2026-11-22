// Keeps the login (token and user) in the browser, so a page refresh
// does not log the user out. Browser storage can be blocked, so every
// access is wrapped in try/catch and the app still works without it.
const KEY = 'mag-session';

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    return saved?.token && saved?.user ? saved : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Not saved: the user stays logged in until the page is closed.
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
}

// Logs in with email and password. Returns { token, user } or throws an
// Error with a message that can be shown to the user.
export async function login(email, password) {
  let res;
  try {
    res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error('Sunucuya bağlanılamadı.');
  }

  if (res.status === 401) {
    throw new Error('E-posta veya şifre hatalı.');
  }
  if (!res.ok) {
    throw new Error('Giriş yapılamadı. Lütfen tekrar dene.');
  }
  return res.json();
}
