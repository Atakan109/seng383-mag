import { useEffect, useState } from 'react';

const ROLE_LABELS = {
  parent: 'Veli',
  specialist: 'Uzman',
  child: 'Çocuk',
};

const LIST_TITLES = {
  parent: 'Çocuklarım',
  specialist: 'Bağlı olduğum çocuklar',
};

// The first screen after login. Each role sees only its own screen (FR-M1-05).
// The module pages (tasks, schedule, ...) are opened from here.
function HomePage({ session, onLogout }) {
  const { token, user } = session;
  const [children, setChildren] = useState([]);
  const [loadState, setLoadState] = useState('loading');

  useEffect(() => {
    let ignore = false;

    async function loadChildren() {
      try {
        const res = await fetch('/api/children', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.status === 401) {
          // The token expired or is no longer valid: log in again.
          onLogout();
          return;
        }
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = await res.json();
        if (!ignore) {
          setChildren(data);
          setLoadState('ready');
        }
      } catch {
        if (!ignore) {
          setLoadState('error');
        }
      }
    }

    loadChildren();
    return () => {
      ignore = true;
    };
  }, [token, onLogout]);

  return (
    <main>
      <header>
        <p>
          Merhaba, {user.name} ({ROLE_LABELS[user.role] ?? user.role})
        </p>
        <button type="button" onClick={onLogout}>
          Çıkış yap
        </button>
      </header>

      {loadState === 'loading' && <p>Yükleniyor...</p>}
      {loadState === 'error' && <p role="alert">Bilgiler yüklenemedi.</p>}

      {loadState === 'ready' && user.role === 'child' && <h1>Hoş geldin!</h1>}

      {loadState === 'ready' && user.role !== 'child' && (
        <section>
          <h1>{LIST_TITLES[user.role]}</h1>
          {children.length === 0 ? (
            <p>Henüz çocuk yok.</p>
          ) : (
            <ul>
              {children.map((child) => (
                <li key={child.id}>
                  {child.name}
                  {child.specialistType && ` – ${child.specialistType}`}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}

export default HomePage;
