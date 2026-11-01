import { useEffect, useState } from 'react';

const STATUS_LABELS = {
  pending: 'Bekliyor',
  done: 'Tamamlandı',
};

function App() {
  const [tasks, setTasks] = useState([]);
  const [loadState, setLoadState] = useState('loading');

  useEffect(() => {
    let ignore = false;

    async function loadTasks() {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) {
          throw new Error(`Request failed: ${res.status}`);
        }
        const data = await res.json();
        if (!ignore) {
          setTasks(data);
          setLoadState('ready');
        }
      } catch {
        if (!ignore) {
          setLoadState('error');
        }
      }
    }

    loadTasks();
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <main>
      <h1>Görevler</h1>
      {loadState === 'loading' && <p>Yükleniyor...</p>}
      {loadState === 'error' && <p role="alert">Görevler yüklenemedi.</p>}
      {loadState === 'ready' && tasks.length === 0 && <p>Henüz görev yok.</p>}
      {loadState === 'ready' && tasks.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Başlık</th>
              <th>Açıklama</th>
              <th>Gelişim alanı</th>
              <th>Bitiş tarihi</th>
              <th>Durum</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id}>
                <td>{task.title}</td>
                <td>{task.description}</td>
                <td>{task.developmentArea}</td>
                <td>{task.dueDate}</td>
                <td>{STATUS_LABELS[task.status] ?? task.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default App;
