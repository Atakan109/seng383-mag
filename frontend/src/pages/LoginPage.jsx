import { useState } from 'react';
import { login } from '../session.js';

// Email and password login (FR-M1-01, FR-M1-02). The role comes from the
// account, so there is no role choice here (FR-M1-03).
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSending(true);
    try {
      onLogin(await login(email.trim(), password));
    } catch (loginError) {
      setError(loginError.message);
      setSending(false);
    }
  }

  return (
    <main>
      <h1>Giriş yap</h1>
      <form onSubmit={handleSubmit}>
        <label>
          E-posta
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label>
          Şifre
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={sending}>
          {sending ? 'Giriş yapılıyor...' : 'Giriş yap'}
        </button>
      </form>
    </main>
  );
}

export default LoginPage;
